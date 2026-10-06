import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const TYPESCRIPT_EXTENSIONS = new Set(['.ts', '.tsx']);
const CONFIGURATION_BASENAMES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'vercel.json',
]);

function compareText(left, right) {
  return left.localeCompare(right, 'en-US');
}

function normalizedPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function nodeDegree(graph) {
  const degrees = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const link of graph.links) {
    degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
    degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
  }
  return degrees;
}

function isFileNode(node) {
  const label = String(node?.label || '');
  const source = normalizedPath(node?.source_file);
  if (!label) return false;
  if (source) {
    const basename = source.split('/').at(-1);
    if (label === basename || (label.includes('/') && (source === label || source.endsWith(`/${label}`)))) return true;
  }
  return false;
}

function isConceptNode(node) {
  const source = normalizedPath(node?.source_file);
  if (!source) return true;
  return !source.split('/').at(-1).includes('.');
}

function isConfigurationOrDependency(node) {
  const source = normalizedPath(node?.source_file);
  if (!source) return false;
  const basename = source.split('/').at(-1);
  return CONFIGURATION_BASENAMES.has(basename)
    || /^tsconfig(?:\.[^.]+)?\.json$/u.test(basename)
    || /^(?:eslint|vite|vitest|playwright)\.config\.[cm]?[jt]s$/u.test(basename);
}

function graphFileNode(graph, sourceFile) {
  const normalized = normalizedPath(sourceFile);
  const basename = normalized.split('/').at(-1);
  return graph.nodes.find((node) => normalizedPath(node.source_file) === normalized
    && (node.label === basename || node.label === normalized || normalized.endsWith(`/${node.label}`)));
}

function graphNodeByLabel(graph, sourceFile, labels) {
  const normalized = normalizedPath(sourceFile);
  return graph.nodes.find((node) => normalizedPath(node.source_file) === normalized && labels.includes(node.label));
}

function declarationName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : '';
}

function declarationKind(node) {
  return ts.isInterfaceDeclaration(node)
    || ts.isTypeAliasDeclaration(node)
    || ts.isClassDeclaration(node)
    || ts.isEnumDeclaration(node);
}

function typeReferenceName(node) {
  if (ts.isTypeReferenceNode(node)) {
    if (ts.isIdentifier(node.typeName)) return node.typeName.text;
    return node.typeName.right.text;
  }
  if (ts.isExpressionWithTypeArguments(node)) {
    if (ts.isIdentifier(node.expression)) return node.expression.text;
    if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  }
  if (ts.isTypeQueryNode(node)) {
    if (ts.isIdentifier(node.exprName)) return node.exprName.text;
    return node.exprName.right.text;
  }
  return '';
}

function ownerLabels(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name) return [`${current.name.text}()`];
    if (ts.isMethodDeclaration(current) && current.name) {
      const name = current.name.getText().replace(/^['"]|['"]$/gu, '');
      return [`${name}()`, `.${name}()`];
    }
    if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isVariableDeclaration(current.parent)) {
      const name = current.parent.name.getText();
      return [`${name}()`, name];
    }
    if (declarationKind(current)) {
      const name = declarationName(current);
      if (name) return [name];
    }
  }
  return [];
}

function resolveModuleSource(currentFile, specifier, sourceFiles) {
  let base;
  if (specifier.startsWith('@/')) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(currentFile), specifier));
  else return '';
  const emittedJavaScriptStem = /\.(?:[cm]?js|jsx)$/u.test(base)
    ? base.replace(/\.(?:[cm]?js|jsx)$/u, '')
    : '';
  const candidates = [
    base,
    ...(emittedJavaScriptStem ? ['.ts', '.tsx', '.mts', '.cts'].map((extension) => `${emittedJavaScriptStem}${extension}`) : []),
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].map((extension) => `${base}${extension}`),
    ...['.ts', '.tsx', '.js', '.jsx'].map((extension) => `${base}/index${extension}`),
  ];
  return candidates.find((candidate) => sourceFiles.has(candidate)) || '';
}

function stableTypeNodeId(sourceFile, name, usedIds) {
  const base = `type_ref_${sourceFile}_${name}`.toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/gu, '_').replace(/^_|_$/gu, '');
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

/** Copy only the explicitly selected corpus, preserving repository-relative paths. */
export function stageCorpusFiles(root, destination, files) {
  for (const relative of files) {
    const source = path.join(root, relative);
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

/** Split application/tooling code from migration and pgTAP SQL. */
export function splitGraphSourceFiles(files) {
  const database = [];
  const main = [];
  for (const file of files) {
    (path.extname(file).toLowerCase() === '.sql' ? database : main).push(file);
  }
  return { main: main.sort(compareText), database: database.sort(compareText) };
}

/**
 * Add deterministic TypeScript type-reference edges missed by Graphify 0.9.48.
 * The pass is lexical, local-only and conservative: unresolved/package types are
 * ignored instead of creating speculative nodes or edges.
 */
export function enrichTypeScriptReferences(graphPath, scanRoot, sourceFiles) {
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const normalizedFiles = sourceFiles.map(normalizedPath)
    .filter((file) => TYPESCRIPT_EXTENSIONS.has(path.extname(file).toLowerCase()) && fs.existsSync(path.join(scanRoot, file)));
  const fileSet = new Set(normalizedFiles);
  const usedIds = new Set(graph.nodes.map((node) => node.id));
  const declarations = new Map();
  const parsed = new Map();
  let nodesAdded = 0;

  for (const relative of normalizedFiles) {
    const text = fs.readFileSync(path.join(scanRoot, relative), 'utf8');
    const source = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    parsed.set(relative, source);
    const byName = new Map();
    const visit = (node) => {
      if (declarationKind(node)) {
        const name = declarationName(node);
        if (name) {
          let graphNode = graphNodeByLabel(graph, relative, [name]);
          if (!graphNode) {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            graphNode = {
              id: stableTypeNodeId(relative, name, usedIds),
              label: name,
              _callable: true,
              _callable_class: true,
              _origin: 'typescript-ast',
              file_type: 'code',
              norm_label: name.toLocaleLowerCase('en-US'),
              source_file: relative,
              source_location: `L${line}`,
            };
            graph.nodes.push(graphNode);
            nodesAdded += 1;
          }
          byName.set(name, graphNode);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    declarations.set(relative, byName);
  }

  const uniqueDeclarations = new Map();
  for (const [relative, entries] of declarations) {
    for (const [name, graphNode] of entries) {
      if (uniqueDeclarations.has(name)) uniqueDeclarations.set(name, null);
      else uniqueDeclarations.set(name, { relative, graphNode });
    }
  }

  const edgeKeys = new Set(graph.links.map((link) => `${link.source}\0${link.target}\0${link.relation || ''}`));
  let typeReferenceEdgesAdded = 0;
  const addEdge = (source, target, sourceFile) => {
    if (!source || !target || source === target) return false;
    const key = `${source}\0${target}\0type_reference`;
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
    graph.links.push({
      source,
      target,
      relation: 'type_reference',
      confidence: 'EXTRACTED',
      confidence_score: 1,
      source_file: sourceFile,
    });
    typeReferenceEdgesAdded += 1;
    return true;
  };

  for (const [relative, source] of parsed) {
    const imports = new Map();
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const targetFile = resolveModuleSource(relative, statement.moduleSpecifier.text, fileSet);
      if (!targetFile) continue;
      const clause = statement.importClause;
      if (clause.name) imports.set(clause.name.text, { targetFile, exported: 'default' });
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          imports.set(element.name.text, { targetFile, exported: element.propertyName?.text || element.name.text });
        }
      }
    }
    const fileNode = graphFileNode(graph, relative);
    const seenReferences = new Set();
    const visit = (node) => {
      const name = typeReferenceName(node);
      if (name) {
        const imported = imports.get(name);
        let target = imported ? declarations.get(imported.targetFile)?.get(imported.exported) : declarations.get(relative)?.get(name);
        if (!target) target = uniqueDeclarations.get(name)?.graphNode;
        if (target) {
          const labels = ownerLabels(node);
          const owner = graphNodeByLabel(graph, relative, labels) || fileNode;
          const signature = `${owner?.id || ''}\0${target.id}`;
          if (!seenReferences.has(signature) && addEdge(owner?.id, target.id, relative)) seenReferences.add(signature);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  // New declarations need the same file-membership relation as native AST nodes.
  const contains = new Set(graph.links.map((link) => `${link.source}\0${link.target}\0${link.relation || ''}`));
  let containmentEdgesAdded = 0;
  for (const node of graph.nodes.filter((entry) => entry._origin === 'typescript-ast')) {
    const fileNode = graphFileNode(graph, node.source_file);
    const key = `${fileNode?.id || ''}\0${node.id}\0contains`;
    if (!fileNode || contains.has(key)) continue;
    contains.add(key);
    graph.links.push({ source: fileNode.id, target: node.id, relation: 'contains', confidence: 'EXTRACTED', confidence_score: 1, source_file: node.source_file });
    containmentEdgesAdded += 1;
  }

  fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
  return { nodesAdded, typeReferenceEdgesAdded, containmentEdgesAdded };
}

export function projectGapMetrics(graph) {
  const relevantNodes = graph.nodes.filter((node) => !isFileNode(node)
    && !isConceptNode(node)
    && !isConfigurationOrDependency(node)
    && node.file_type !== 'rationale');
  const relevantIds = new Set(relevantNodes.map((node) => node.id));
  const degrees = nodeDegree({
    nodes: relevantNodes,
    links: graph.links.filter((link) => relevantIds.has(link.source) && relevantIds.has(link.target)),
  });
  const eligible = relevantNodes.filter((node) => (degrees.get(node.id) ?? 0) <= 1);
  const communities = new Map();
  for (const node of relevantNodes) {
    const id = String(node.community ?? 'unassigned');
    if (!communities.has(id)) communities.set(id, []);
    communities.get(id).push(node);
  }
  const thinCommunities = [...communities.entries()].filter(([, nodes]) => nodes.length > 0 && nodes.length < 3);
  return {
    lowConnectivityNodes: eligible,
    thinCommunities,
    excludedConfigurationNodes: graph.nodes.filter(isConfigurationOrDependency).length,
    excludedConceptNodes: graph.nodes.filter(isConceptNode).length,
  };
}

function quantity(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Rewrite only generated prose; graph topology remains untouched. */
export function normalizeGraphReport(reportPath, graphPath, { title, updateCommand }) {
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const metrics = projectGapMetrics(graph);
  let report = fs.readFileSync(reportPath, 'utf8');
  report = report.replace(/^# Graph Report - .*$/mu, `# Relatório Graphify — ${title}`);
  report = report.replace(/^- Run `graphify update \.` after code changes \(no API cost\)\.$/mu, `- Após mudanças no código, execute \`${updateCommand}\` pelo wrapper seguro do projeto.`);
  const labels = metrics.lowConnectivityNodes.slice(0, 5).map((node) => `\`${node.label}\``).join(', ');
  const suffix = metrics.lowConnectivityNodes.length > 5 ? ` (+${metrics.lowConnectivityNodes.length - 5} outros)` : '';
  const section = [
    '## Lacunas de conhecimento — filtro do projeto',
    `- **${quantity(metrics.lowConnectivityNodes.length, 'nó de baixa conectividade', 'nós de baixa conectividade')}:** ${labels || '_nenhum_'}${suffix}`,
    '  Possuem no máximo uma relação estrutural depois de excluir dependências externas e arquivos de configuração. A métrica orienta revisão; não comprova código morto.',
    `- **${quantity(metrics.thinCommunities.length, 'comunidade pequena', 'comunidades pequenas')} (menos de 3 nós relevantes) ${metrics.thinCommunities.length === 1 ? 'omitida' : 'omitidas'} do relatório principal.** Elas continuam disponíveis no grafo interativo e no JSON.`,
    `- **${quantity(metrics.excludedConfigurationNodes, 'nó de dependência/configuração excluído', 'nós de dependências/configuração excluídos')} desta métrica.**`,
    `- **${quantity(metrics.excludedConceptNodes, 'nó conceitual ou sem arquivo-fonte local excluído', 'nós conceituais ou sem arquivo-fonte local excluídos')} desta métrica.**`,
  ].join('\n');
  if (/## Knowledge Gaps[\s\S]*?(?=\n## |$)/u.test(report)) {
    report = report.replace(/## Knowledge Gaps[\s\S]*?(?=\n## |$)/u, section);
  } else if (/\n## Suggested Questions/u.test(report)) {
    report = report.replace(/\n## Suggested Questions/u, `\n${section}\n\n## Suggested Questions`);
  } else {
    report = `${report.trimEnd()}\n\n${section}\n`;
  }
  fs.writeFileSync(reportPath, report);
  return {
    lowConnectivityNodes: metrics.lowConnectivityNodes.length,
    thinCommunities: metrics.thinCommunities.length,
    excludedConfigurationNodes: metrics.excludedConfigurationNodes,
    excludedConceptNodes: metrics.excludedConceptNodes,
  };
}

export function validateSeparatedCorpora(mainGraph, databaseGraph) {
  const sqlInMain = mainGraph.nodes.filter((node) => normalizedPath(node.source_file).endsWith('.sql'));
  const nonSqlInDatabase = databaseGraph.nodes.filter((node) => node.source_file && !normalizedPath(node.source_file).endsWith('.sql'));
  if (sqlInMain.length) throw new Error(`Mapa principal contém ${sqlInMain.length} nó(s) SQL.`);
  if (nonSqlInDatabase.length) throw new Error(`Mapa de banco contém ${nonSqlInDatabase.length} nó(s) fora de SQL.`);
  return { sqlInMain: 0, nonSqlInDatabase: 0 };
}
