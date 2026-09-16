import { createHmac } from 'node:crypto';

// Etapa 25 do plano de correções: gera um JWT de serviço com role:site_api, assinado
// com o Legacy JWT Secret do projeto isolado do site (Settings > API > JWT Settings no
// dashboard do Supabase). Mesmo formato de claims usado pelas chaves anon/service_role
// legadas do projeto (iss, ref, role, iat, exp) — o gateway do Supabase continua
// validando JWTs HS256 assinados com esse segredo mesmo em projetos que também usam
// JWKS para os tokens que o próprio GoTrue emite no login de usuário.
//
// Nunca commitar a saída deste script. Uso:
//   SITE_SUPABASE_JWT_SECRET=... node scripts/generate-site-api-jwt.mjs

const PROJECT_REF = 'xlzmclcjdncjfdrjxclt';
const ROLE = 'site_api';
const YEARS_VALID = 10;

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signHs256(secret, headerAndPayload) {
  return base64url(createHmac('sha256', secret).update(headerAndPayload).digest());
}

function main() {
  const secret = process.env.SITE_SUPABASE_JWT_SECRET?.trim();
  if (!secret) {
    console.error('Defina SITE_SUPABASE_JWT_SECRET (Legacy JWT Secret do projeto) antes de rodar este script.');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: 'supabase',
    ref: PROJECT_REF,
    role: ROLE,
    iat: now,
    exp: now + YEARS_VALID * 365 * 24 * 60 * 60,
  };

  const headerAndPayload = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = signHs256(secret, headerAndPayload);
  const jwt = `${headerAndPayload}.${signature}`;

  console.log(jwt);
  console.error(`\nToken gerado para role=${ROLE}, ref=${PROJECT_REF}, expira em ${new Date(payload.exp * 1000).toISOString().slice(0, 10)}.`);
  console.error('Cole em SITE_SUPABASE_SERVICE_JWT nas variáveis de ambiente server-side da Vercel — nunca em variável VITE_ (chega ao navegador).');
  console.error('Não commite este valor. Depois de configurar na Vercel, feche o terminal ou limpe o histórico do shell.');
}

main();
