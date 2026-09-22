import { siteSupabase } from './siteSupabase';

export const BRIEFING_ASSET_BUCKET = 'customer-briefing-assets';
export const MAX_BRIEFING_ASSET_BYTES = 10 * 1024 * 1024;
export const MAX_BRIEFING_ASSETS = 10;
export const BRIEFING_ASSET_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const;

export type BriefingAssetKind = 'logo' | 'reference';

export interface BriefingAsset {
  id: string;
  kind: BriefingAssetKind;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  quoteRequestId: string | null;
  createdAt: string;
  expiresAt: string;
}

function client() {
  if (!siteSupabase) throw new Error('Entre na sua conta para enviar arquivos.');
  return siteSupabase;
}

function rpcError(message?: string): Error {
  if (message?.includes('briefing_asset_limit_reached')) return new Error('Você atingiu o limite de 10 arquivos ou 50 MB na biblioteca.');
  if (message?.includes('briefing_asset_not_deletable')) return new Error('Este arquivo já faz parte de um briefing e não pode ser removido por aqui.');
  if (message?.includes('authentication_required')) return new Error('Sua sessão expirou. Entre novamente.');
  return new Error('Não foi possível concluir a operação com o arquivo. Tente novamente.');
}

export function briefingAssetValidationError(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  if (!file.name.trim() || file.name.length > 160) return 'Use um nome de arquivo com até 160 caracteres.';
  if (!BRIEFING_ASSET_MIME_TYPES.includes(file.type as typeof BRIEFING_ASSET_MIME_TYPES[number])) {
    return 'Envie PNG, JPG, WebP ou PDF.';
  }
  if (file.size < 1 || file.size > MAX_BRIEFING_ASSET_BYTES) return 'Cada arquivo deve ter até 10 MB.';
  return null;
}

function normalizeAsset(value: unknown): BriefingAsset | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || typeof item.path !== 'string' || typeof item.name !== 'string') return null;
  return {
    id: item.id,
    kind: item.kind === 'logo' ? 'logo' : 'reference',
    name: item.name,
    path: item.path,
    mimeType: typeof item.mimeType === 'string' ? item.mimeType : '',
    sizeBytes: Number(item.sizeBytes || 0),
    quoteRequestId: typeof item.quoteRequestId === 'string' ? item.quoteRequestId : null,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
    expiresAt: typeof item.expiresAt === 'string' ? item.expiresAt : '',
  };
}

export async function listMyBriefingAssets(): Promise<BriefingAsset[]> {
  const { data, error } = await client().rpc('list_my_briefing_assets');
  if (error) throw rpcError(error.message);
  return (Array.isArray(data) ? data : []).map(normalizeAsset).filter((asset): asset is BriefingAsset => Boolean(asset));
}

export async function uploadMyBriefingAsset(file: File, kind: BriefingAssetKind): Promise<BriefingAsset> {
  const validationError = briefingAssetValidationError(file);
  if (validationError) throw new Error(validationError);
  const supabase = client();
  const { data, error } = await supabase.rpc('create_my_briefing_asset', {
    p_original_name: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_kind: kind,
  });
  if (error) throw rpcError(error.message);
  const asset = normalizeAsset(data);
  if (!asset) throw new Error('O arquivo não recebeu um identificador válido.');

  const uploaded = await supabase.storage.from(BRIEFING_ASSET_BUCKET).upload(asset.path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: '0',
  });
  if (uploaded.error) {
    try {
      await supabase.rpc('delete_my_briefing_asset', { p_id: asset.id });
    } catch {
      // A fila de retenção também trata metadados expirados; a falha de limpeza
      // compensatória não deve esconder o erro original do upload.
    }
    throw new Error('Não foi possível transferir o arquivo. Ele não foi anexado.');
  }
  return asset;
}

export async function deleteMyBriefingAsset(asset: BriefingAsset): Promise<void> {
  if (asset.quoteRequestId) throw new Error('Este arquivo já faz parte de um briefing e não pode ser removido por aqui.');
  const supabase = client();
  const removed = await supabase.storage.from(BRIEFING_ASSET_BUCKET).remove([asset.path]);
  if (removed.error) throw new Error('Não foi possível remover o arquivo do armazenamento.');
  const { error } = await supabase.rpc('delete_my_briefing_asset', { p_id: asset.id });
  if (error) throw rpcError(error.message);
}

export async function attachMyBriefingAssetsToQuote(requestId: string, assetIds: string[]): Promise<number> {
  if (!assetIds.length) return 0;
  const { data, error } = await client().rpc('attach_my_briefing_assets_to_quote', {
    p_request_id: requestId,
    p_asset_ids: assetIds,
  });
  if (error) throw rpcError(error.message);
  return Number(data || 0);
}
