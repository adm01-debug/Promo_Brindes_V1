import { describe, expect, it } from 'vitest';
import { resolveSitePublishableKey, resolveSiteSupabaseUrl } from './siteSupabaseConfig';

describe('configuração pública da Área do Cliente', () => {
  it('aceita somente o projeto Supabase isolado do site', () => {
    expect(resolveSiteSupabaseUrl('https://xlzmclcjdncjfdrjxclt.supabase.co/rest/v1')).toBe('https://xlzmclcjdncjfdrjxclt.supabase.co');
    expect(resolveSiteSupabaseUrl('https://doufsxqlfjyuvxuezpln.supabase.co')).toBe('');
    expect(resolveSiteSupabaseUrl('https://evil.test/?xlzmclcjdncjfdrjxclt')).toBe('');
  });

  it('recusa secret key no bundle e aceita somente chave pública', () => {
    expect(resolveSitePublishableKey('sb_secret_nao_pode_vazar')).toBe('');
    expect(resolveSitePublishableKey('sb_publishable_teste')).toBe('sb_publishable_teste');
    const payload = btoa(JSON.stringify({ role: 'anon', ref: 'xlzmclcjdncjfdrjxclt' }));
    expect(resolveSitePublishableKey(`header.${payload}.signature`)).toContain(payload);
    const wrong = btoa(JSON.stringify({ role: 'service_role', ref: 'xlzmclcjdncjfdrjxclt' }));
    expect(resolveSitePublishableKey(`header.${wrong}.signature`)).toBe('');
  });

  it('em Preview recusa o banco de produção e o banco interno, inclusive sem configuração explícita', () => {
    const previewRef = 'unkaeotwziynruktxizp';
    expect(resolveSiteSupabaseUrl('https://xlzmclcjdncjfdrjxclt.supabase.co', 'preview', previewRef)).toBe('');
    expect(resolveSiteSupabaseUrl('https://doufsxqlfjyuvxuezpln.supabase.co', 'preview', previewRef)).toBe('');
    expect(resolveSiteSupabaseUrl(undefined, 'preview', previewRef)).toBe('');
    expect(resolveSiteSupabaseUrl('https://xlzmclcjdncjfdrjxclt.supabase.co', 'preview', '')).toBe('');
    expect(resolveSiteSupabaseUrl('https://unkaeotwziynruktxizp.supabase.co', 'preview', previewRef))
      .toBe('https://unkaeotwziynruktxizp.supabase.co');
  });
});
