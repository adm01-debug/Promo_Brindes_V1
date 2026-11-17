import type { Database } from '../../src/types/site-database.types.js';

type SiteFunctions = Database['public']['Functions'];

/**
 * Nome de RPC que existe de fato no banco isolado, conforme o catálogo gerado
 * em src/types/site-database.types.ts (regerado do banco e com guarda de drift
 * no CI, .github/workflows/database.yml:50-57). Antes, o nome era `string`:
 * um typo ou uma função renomeada no banco só aparecia em produção, como 503.
 */
export type SiteRpcName = keyof SiteFunctions & string;

/**
 * Argumentos daquela RPC, conforme o mesmo catálogo. Funções sem argumento vêm
 * do gerador como `never`; aqui viram objeto vazio, para que a chamada continue
 * podendo passar `{}` sem perder a checagem das demais.
 */
export type SiteRpcArgs<Name extends SiteRpcName> =
  SiteFunctions[Name]['Args'] extends never ? Record<string, never> : SiteFunctions[Name]['Args'];
