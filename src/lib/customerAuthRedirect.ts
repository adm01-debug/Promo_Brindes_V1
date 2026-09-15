const CANONICAL_PUBLIC_ORIGIN = 'https://promo-brindes-v1.vercel.app';

/** Mantém magic links e recuperação dentro do host público aprovado. */
export function customerAuthRedirect(next: string): string {
  const url = new URL('/auth/confirm', CANONICAL_PUBLIC_ORIGIN);
  url.searchParams.set('next', next);
  return url.href;
}
