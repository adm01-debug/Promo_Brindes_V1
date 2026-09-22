import { FileImage, FileText, LoaderCircle, LockKeyhole, Paperclip, Trash2, Upload } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/customerAuth';
import {
  briefingAssetValidationError,
  deleteMyBriefingAsset,
  listMyBriefingAssets,
  MAX_BRIEFING_ASSETS,
  uploadMyBriefingAsset,
  type BriefingAsset,
  type BriefingAssetKind,
} from '../lib/briefingAssets';

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} KB`;
}

export function BriefingAssetUploader({ value, onChange, contactEmail }: {
  value: string[];
  onChange: (ids: string[]) => void;
  contactEmail: string;
}) {
  const auth = useCustomerAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<BriefingAsset[]>([]);
  const [kind, setKind] = useState<BriefingAssetKind>('logo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const accountEmail = auth.user?.email?.trim().toLowerCase() || '';
  const normalizedContactEmail = contactEmail.trim().toLowerCase();
  const emailMismatch = Boolean(accountEmail && normalizedContactEmail && accountEmail !== normalizedContactEmail);

  useEffect(() => {
    if (!auth.user) {
      setAssets([]);
      onChange([]);
      return;
    }
    let active = true;
    setLoading(true);
    void listMyBriefingAssets()
      .then((items) => {
        if (!active) return;
        setAssets(items);
        const available = new Set(items.filter((item) => !item.quoteRequestId).map((item) => item.id));
        onChange(value.filter((id) => available.has(id)));
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar seus arquivos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // A troca de identidade é a fronteira de privacidade; mudanças de seleção não
    // devem refazer a consulta nem disputar com o upload em andamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const validationError = briefingAssetValidationError(file);
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError('');
    try {
      const asset = await uploadMyBriefingAsset(file, kind);
      setAssets((current) => [asset, ...current]);
      onChange([...new Set([...value, asset.id])]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setLoading(false);
    }
  }

  async function remove(asset: BriefingAsset) {
    setLoading(true);
    setError('');
    try {
      await deleteMyBriefingAsset(asset);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      onChange(value.filter((id) => id !== asset.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível remover o arquivo.');
    } finally {
      setLoading(false);
    }
  }

  if (!auth.user) {
    return <aside className="briefing-assets briefing-assets--locked"><LockKeyhole aria-hidden="true" /><div><strong>Quer anexar logo ou referências?</strong><p>Entre na sua conta para usar o envio privado. Sua seleção e este rascunho continuam aqui.</p><Link to="/entrar?next=/orcamento">Entrar para anexar</Link></div></aside>;
  }

  return (
    <fieldset className="briefing-assets" disabled={loading || emailMismatch}>
      <legend><Paperclip aria-hidden="true" /> Logo e referências <span>opcional</span></legend>
      <p>Arquivos privados, disponíveis apenas para você e para o atendimento deste briefing. PNG, JPG, WebP ou PDF, até 10 MB.</p>
      {emailMismatch && <div className="briefing-assets__warning" role="alert">Use no formulário o mesmo e-mail da conta ({accountEmail}) para vincular estes arquivos com segurança.</div>}
      <div className="briefing-assets__toolbar">
        <label><span>Tipo do arquivo</span><select value={kind} onChange={(event) => setKind(event.target.value as BriefingAssetKind)}><option value="logo">Logo da marca</option><option value="reference">Referência visual</option></select></label>
        <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => void upload(event)} />
        <button type="button" className="button button--outline" onClick={() => inputRef.current?.click()} disabled={loading || assets.length >= MAX_BRIEFING_ASSETS || emailMismatch}>{loading ? <LoaderCircle className="is-spinning" /> : <Upload />} {loading ? 'Processando…' : 'Escolher arquivo'}</button>
      </div>
      {error && <div className="field-error" role="alert">{error}</div>}
      {assets.length > 0 && <ul className="briefing-assets__list">
        {assets.map((asset) => {
          const available = !asset.quoteRequestId;
          const selected = value.includes(asset.id);
          return <li key={asset.id} className={selected ? 'is-selected' : ''}>
            <label>
              <input type="checkbox" checked={selected} disabled={!available || emailMismatch} onChange={(event) => onChange(event.target.checked ? [...new Set([...value, asset.id])] : value.filter((id) => id !== asset.id))} />
              {asset.mimeType === 'application/pdf' ? <FileText aria-hidden="true" /> : <FileImage aria-hidden="true" />}
              <span><strong>{asset.name}</strong><small>{fileSize(asset.sizeBytes)} · {asset.kind === 'logo' ? 'Logo' : 'Referência'}{!available ? ' · já enviado' : ''}</small></span>
            </label>
            {available && <button type="button" aria-label={`Remover ${asset.name}`} onClick={() => void remove(asset)} disabled={loading}><Trash2 /></button>}
          </li>;
        })}
      </ul>}
      <small>{value.length} selecionado{value.length === 1 ? '' : 's'} para este briefing · {assets.length}/{MAX_BRIEFING_ASSETS} arquivos na biblioteca</small>
    </fieldset>
  );
}
