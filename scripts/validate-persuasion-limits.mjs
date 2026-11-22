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
      /\d{2,} mil clientes/i,
      /mais de \d+ (clientes|empresas)/i,
      /nota \d(\.\d)? de 5/i,
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
      /checkbox[^\n]*defaultChecked/i,
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