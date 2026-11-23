import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

// Etapa 009 do plano Carnegie (limites de persuasao). O site nao pode usar urgencia
// ficticia, culpa ao recusar, elogio automatico, dado presumido, prova social
// inventada nem consentimento disfarcado. Este guard varre a interface e reprova os
// seis padroes; roda junto dos outros testes de automacao (pre-commit e pre-push).
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

export const LIMITS = [
  {
    id: 'urgencia-ficticia',
    title: 'urgencia ficticia',
    why: 'prazo ou escassez inventados pressionam uma decisao que o negocio nao impoe',
    patterns: [
      /ultimas unidades/i,
      /so hoje/i,
      /ultima chance/i,
      /oferta acaba/i,
      /vagas limitadas/i,
      /tempo restante/i,
      /expira em/i,
    ],
  },
  {
    id: 'culpa-ao-recusar',
    title: 'culpa ao recusar',
    why: 'sair, pular ou escolher outro produto nao pode gerar mensagem depreciativa',
    patterns: [
      /vai se arrepender/i,
      /nao deixe para depois/i,
      /vai perder (essa|a) (chance|oportunidade)/i,
      /voce esta deixando/i,
    ],
  },
  {
    id: 'elogio-automatico',
    title: 'elogio automatico exagerado',
    why: 'elogiar a escolha do visitante sem conhecer o pedido e adulacao vazia',
    patterns: [
      /excelente escolha/i,
      /otima escolha/i,
      /perfeita escolha/i,
      /voce tem bom gosto/i,
      /escolha inteligente/i,
    ],
  },
  {
    id: 'prova-social-inventada',
    title: 'prova social inventada',
    why: 'numero de clientes, nota e depoimento so podem aparecer se forem reais e verificaveis',
    patterns: [
      // "9 mil clientes" e "1.000 empresas" tambem sao numero inventado: o padrao antigo
      // exigia dois digitos e deixava passar contagem escrita por extenso/milhar.
      /\d{1,3}(?:\.\d{3})*\s*mil clientes/i,
      /mais de \d{1,3}(?:\.\d{3})* (clientes|empresas)/i,
      // Nota pode vir com ponto (4.9) ou virgula (4,9) e com decimais variaveis.
      /nota \d{1,2}([.,]\d{1,2})? de 5/i,
      /5 estrelas/i,
      /melhor do mercado/i,
    ],
  },
  {
    id: 'dado-presumido',
    title: 'dado presumido',
    why: 'campo de formulario so pode vir do visitante ou da conta dele, nunca de suposicao',
    patterns: [/supomos que/i, /provavelmente voce/i, /sabemos que voce/i, /como voce sempre/i],
  },
  {
    id: 'consentimento-disfarcado',
    title: 'consentimento disfarcado',
    why: 'aceite de contato ou marketing precisa de acao explicita do visitante',
    patterns: [
      /ao continuar voce (aceita|concorda) receber/i,
      /ja aceitou/i,
    ],
  },
];

const SKIP = /[\\/](node_modules|dist|build|coverage)[\\/]/;

// Os padroes sao escritos sem acento para nao depender de como o texto foi digitado;
// a linha e normalizada (NFD sem marcas) antes de cada teste.
export function foldText(line) {
  return line.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function listInterfaceFiles(dir = SRC, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.test(absolute)) listInterfaceFiles(absolute, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
}

/** Atributo JSX do elemento, ignorando os que vem por spread (`{...props}`). */
function jsxAttribute(file, attributes, name) {
  for (const property of attributes.properties) {
    if (ts.isJsxAttribute(property) && property.name.getText(file) === name) return property;
  }
  return null;
}

function isCheckboxType(attribute) {
  const initializer = attribute?.initializer;
  if (!initializer) return false;
  if (ts.isStringLiteral(initializer)) return initializer.text === 'checkbox';
  return ts.isJsxExpression(initializer)
    && Boolean(initializer.expression)
    && ts.isStringLiteral(initializer.expression)
    && initializer.expression.text === 'checkbox';
}

/**
 * `defaultChecked` sem valor, com `true` ou com expressao qualquer deixa a caixa marcada no
 * primeiro render; so o literal `false` prova o contrario. A arvore do TypeScript e usada
 * porque comentario nao passa a existir para o parser — exemplo comentado ou
 * `defaultChecked={false}` nao sao consentimento pre-marcado.
 */
function mayStartChecked(attribute) {
  const initializer = attribute.initializer;
  if (!initializer) return true;
  if (!ts.isJsxExpression(initializer)) return true;
  const expression = initializer.expression;
  return !(expression && expression.kind === ts.SyntaxKind.FalseKeyword);
}

/** Caixas de consentimento que podem nascer marcadas em um arquivo JSX. */
export function findDefaultCheckedConsentInputs(source, relative) {
  const scriptKind = /\.jsx$/i.test(relative) ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const file = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, scriptKind);
  const errors = [];
  const check = (node) => {
    if (!isCheckboxType(jsxAttribute(file, node.attributes, 'type'))) return;
    const checked = jsxAttribute(file, node.attributes, 'defaultChecked');
    if (!checked || !mayStartChecked(checked)) return;
    const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
    errors.push(
      `${relative}:${line} viola "consentimento disfarcado" (defaultChecked): caixa de consentimento nao pode vir marcada | ${node.getText(file).replace(/\s+/g, ' ').trim().slice(0, 120)}`,
    );
  };
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) check(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return errors;
}

/** Reprovacoes da etapa 009 nos arquivos informados (por padrao, toda a interface). */
export function findPersuasionViolations(files = listInterfaceFiles()) {
  const errors = [];
  for (const absolute of files) {
    const relative = path.relative(ROOT, absolute).split(path.sep).join('/');
    const lines = readFileSync(absolute, 'utf8').split('\n');
    lines.forEach((line, index) => {
      // Comentario que cita o padrao (para documentar a regra) nao e promessa na tela.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const folded = foldText(line);
      for (const limit of LIMITS) {
        const hit = limit.patterns.find((pattern) => pattern.test(folded));
        if (!hit) continue;
        errors.push(
          `${relative}:${index + 1} viola "${limit.title}" (${hit}): ${limit.why} | ${line.trim().slice(0, 120)}`,
        );
      }
    });

    // Caixa pre-marcada em JSX multilinha: o padrao por linha nao enxerga
    // <input newline type="checkbox" newline defaultChecked />, e a ordem dos atributos
    // varia. A varredura por elemento cobre a tag inteira; a arvore do TypeScript ainda
    // ignora comentario e aceita `defaultChecked={false}` como caixa desmarcada.
    if (/\.jsx$/i.test(absolute) || /\.tsx$/i.test(absolute)) {
      errors.push(...findDefaultCheckedConsentInputs(lines.join('\n'), relative));
    }
  }
  return errors;
}

export function persuasionSummary() {
  return LIMITS.map((limit) => limit.title).join(', ');
}

function main() {
  const files = listInterfaceFiles();
  if (files.length === 0) {
    console.error('src sem arquivos de interface: o guard de persuasao nao tem o que varrer');
    process.exit(1);
  }
  const errors = findPersuasionViolations(files);
  if (errors.length > 0) {
    console.error('Limites de persuasao reprovados (etapa 009):');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(
    `Limites de persuasao aprovados: 6 regras em ${files.length} arquivos de interface (${persuasionSummary()}).`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();