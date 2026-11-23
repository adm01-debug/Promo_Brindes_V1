import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

/** Atributo `type="checkbox"` no elemento, aceitando aspas simples e expressao JSX. */
const CHECKBOX_TYPE = /type\s*=\s*(?:"checkbox"|'checkbox'|\{\s*['"]checkbox['"]\s*\})/;

/**
 * Comentario nao e a promessa na tela, e o CI de automacao roda sem devDependencies —
 * `typescript` nao esta disponivel ali. Este scanner troca comentario por espaco
 * preservando offsets (e portanto as linhas), respeitando strings e template literals.
 */
export function stripJsComments(source) {
  let out = '';
  let quote = null;
  for (let index = 0; index < source.length;) {
    const char = source[index];
    const next = source[index + 1];
    if (quote) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        out += ' ';
        index += 1;
      }
      continue;
    }
    if (char === '/' && next === '*') {
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        out += source[index] === '\n' ? '\n' : ' ';
        index += 1;
      }
      out += '  ';
      index += 2;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    out += char;
    index += 1;
  }
  return out;
}

/** Elementos `<input ...>` do conteudo, sem parar no `>` de uma expressao JSX. */
function findInputTags(source) {
  const tags = [];
  for (let start = source.indexOf('<input'); start !== -1; start = source.indexOf('<input', start + 6)) {
    if (/[A-Za-z0-9_-]/.test(source[start + 6] ?? '')) continue;
    let depth = 0;
    let quote = null;
    let index = start + 6;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') quote = char;
      else if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0) break;
    }
    if (index >= source.length) continue;
    tags.push({ text: source.slice(start, index + 1), index: start });
  }
  return tags;
}

/**
 * `defaultChecked` sem valor, com `true` ou com expressao qualquer deixa a caixa marcada no
 * primeiro render; so o literal `false` prova o contrario. Sem valor e sem `false`, reprova.
 *
 * A varredura anda por NOMES de atributo e pula o valor de cada um: busca textual levava o
 * resultado de rotulo (`aria-label="defaultChecked"` reprovava, `title="defaultChecked={false}"`
 * aprovava) para o atributo seguinte, que e o que importa.
 *
 * O nome e comparado antes do `:` para nao perder spread de literal
 * (`{...{ defaultChecked: true }}` marca a caixa igual a `defaultChecked`). Na propriedade do
 * objeto literal o valor vem depois de `:`, entao `defaultChecked: false` e lido e aprovado.
 * Spread opaco (`{...props}`) nao entra: exigiria avaliar o objeto, que uma varredura de texto
 * nao faz.
 */
function mayStartChecked(tag) {
  let index = 0;
  while (index < tag.length) {
    const name = /^\s*([A-Za-z_$][\w$:.-]*)/.exec(tag.slice(index));
    if (!name) {
      index += 1;
      continue;
    }
    index += name[0].length;
    let value = null;
    const equals = /^\s*=\s*/.exec(tag.slice(index));
    if (equals) {
      index += equals[0].length;
      const opening = tag[index];
      if (opening === '{' || opening === '"' || opening === "'") {
        const closing = opening === '{' ? '}' : opening;
        const valueStart = index;
        index += 1;
        while (index < tag.length) {
          const char = tag[index];
          if (char === '\\') {
            index += 2;
            continue;
          }
          // Expressao pode conter string que fecha com a mesma aspa da tag: "a > b" ou {'}'}.
          if (closing === '}' && (char === '"' || char === "'" || char === '`')) {
            const inner = char;
            index += 1;
            while (index < tag.length && tag[index] !== inner) index += tag[index] === '\\' ? 2 : 1;
            index += 1;
            continue;
          }
          index += 1;
          if (char === closing) break;
        }
        value = tag.slice(valueStart, index);
      } else {
        const bare = /^[^\s/>{}]+/.exec(tag.slice(index));
        value = bare ? bare[0] : '';
        index += value.length;
      }
    }
    const attribute = name[1].split(':')[0];
    if (attribute !== 'defaultChecked') continue;
    if (name[1].endsWith(':')) {
      // Propriedade de objeto literal em spread (`{...{ defaultChecked: true }}`).
      const literal = /^\s*(true|false)\b/.exec(tag.slice(index));
      if (!literal) return true;
      if (literal[1] === 'true') return true;
      continue;
    }
    if (value === null) return true;
    if (!value.startsWith('{')) return true;
    return value.slice(1, -1).trim() !== 'false';
  }
  return false;
}

/** Caixas de consentimento que podem nascer marcadas em um arquivo JSX. */
export function findDefaultCheckedConsentInputs(source, relative) {
  const stripped = stripJsComments(source);
  const errors = [];
  for (const tag of findInputTags(stripped)) {
    if (!CHECKBOX_TYPE.test(tag.text) || !mayStartChecked(tag.text)) continue;
    const line = stripped.slice(0, tag.index).split('\n').length;
    errors.push(
      `${relative}:${line} viola "consentimento disfarcado" (defaultChecked): caixa de consentimento nao pode vir marcada | ${tag.text.replace(/\s+/g, ' ').trim().slice(0, 120)}`,
    );
  }
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
    // varia. A varredura por elemento cobre a tag inteira; comentario e trocado por espaco
    // antes, entao exemplo comentado nao reprova e `defaultChecked={false}` e aceito.
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