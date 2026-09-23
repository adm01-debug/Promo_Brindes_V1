import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Etapa 4 do plano de correções (docs/PLANO_CORRECOES_MELHORIAS_50_ETAPAS_20260916.md):
// o incidente de 15/09/2026 (timestamps com underscore, ex.: 20260908_230000) só foi
// detectado manualmente. Este guard falha o build antes que aconteça de novo.

// Só o diretório do site é uma migration folder ativa deste repositório. O contrato do
// catálogo canônico vive em docs/sql/canonical/ (espelho somente-leitura, fora de
// qualquer pasta que o CLI do Supabase reconheça — ver etapa 45 do plano de correções).
export const MIGRATION_DIRS = ['site-supabase/supabase/migrations'];
const NAME_PATTERN = /^(\d{14})_([a-z0-9_]+)\.sql$/;

export function isValidCalendarTimestamp(digits) {
  if (!/^\d{14}$/.test(digits)) return false;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const hour = Number(digits.slice(8, 10));
  const minute = Number(digits.slice(10, 12));
  const second = Number(digits.slice(12, 14));
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  if (year < 2020 || year > 2100) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day
    && candidate.getUTCHours() === hour
    && candidate.getUTCMinutes() === minute
    && candidate.getUTCSeconds() === second;
}

/**
 * Valida uma lista de nomes de arquivo de um único diretório de migrations.
 * Não toca no filesystem: recebe os nomes já listados, para ser testável sem fixtures em disco.
 */
export function validateMigrationFileNames(dirLabel, fileNames) {
  const errors = [];
  let previousVersion = null;
  const seenVersions = new Set();

  for (const name of [...fileNames].sort()) {
    const match = NAME_PATTERN.exec(name);
    if (!match) {
      errors.push(`${dirLabel}/${name}: nome fora do padrão <14 dígitos>_<descrição>.sql (sem underscore no timestamp)`);
      continue;
    }

    const [, version] = match;
    if (!isValidCalendarTimestamp(version)) {
      errors.push(`${dirLabel}/${name}: timestamp ${version} não é uma data/hora válida`);
    }
    if (seenVersions.has(version)) {
      errors.push(`${dirLabel}/${name}: versão ${version} duplicada dentro do diretório`);
    }
    seenVersions.add(version);

    if (previousVersion !== null && version <= previousVersion) {
      errors.push(`${dirLabel}/${name}: versão ${version} não é estritamente maior que a migration anterior (${previousVersion})`);
    }
    previousVersion = version;
  }

  return errors;
}

export function validateMigrationDirsOnDisk(dirs = MIGRATION_DIRS, readDir = readdirSync) {
  return dirs.flatMap((dir) => {
    let files;
    try {
      files = readDir(dir).filter((name) => name.endsWith('.sql'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    return validateMigrationFileNames(dir, files);
  });
}

const FORBIDDEN_TOP_LEVEL_MIGRATIONS_DIR = 'supabase/migrations';

/**
 * Etapa 45 do plano de correções: um `supabase/migrations` no topo do repositório foi
 * o incidente original — `supabase/.temp/linked-project.json` apontava para o projeto
 * do site enquanto a única migration ali era do canônico. O contrato do catálogo
 * canônico vive em `docs/sql/canonical/` (espelho somente-leitura, fora de qualquer
 * pasta que o CLI do Supabase reconheça); recriar essa pasta reintroduziria o link
 * incoerente silenciosamente.
 */
export function validateNoTopLevelSupabaseMigrationsDir(exists = existsSync) {
  if (exists(FORBIDDEN_TOP_LEVEL_MIGRATIONS_DIR)) {
    return [
      `${FORBIDDEN_TOP_LEVEL_MIGRATIONS_DIR} não deveria existir neste repositório — reintroduz o link incoerente do incidente pré-16/09 (ver Etapa 45 do plano de correções); o contrato do catálogo canônico vive em docs/sql/canonical/`,
    ];
  }
  return [];
}

function runCli() {
  const errors = [...validateMigrationDirsOnDisk(), ...validateNoTopLevelSupabaseMigrationsDir()];
  if (errors.length > 0) {
    console.error('Nomes de migration inválidos:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
  console.log('Nomes de migration válidos em todos os diretórios verificados.');
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  runCli();
}
