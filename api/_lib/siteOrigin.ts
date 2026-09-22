/** Exact browser origins allowed for the current deployment. Preview never trusts production. */
export function allowedSiteOrigins(): ReadonlySet<string> {
  if (process.env.VERCEL_ENV === 'preview') {
    const host = process.env.VERCEL_URL?.trim();
    return new Set(host && /^[a-z0-9][a-z0-9.-]*\.vercel\.app$/i.test(host)
      ? [`https://${host}`]
      : []);
  }
  const configured = process.env.SITE_PUBLIC_ORIGIN?.trim();
  if (!configured) return new Set();
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:' || parsed.origin !== configured) return new Set();
    return new Set([configured]);
  } catch {
    return new Set();
  }
}
