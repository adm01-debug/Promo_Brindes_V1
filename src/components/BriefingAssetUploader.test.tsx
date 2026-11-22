import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BriefingAssetUploader } from './BriefingAssetUploader';
import { deleteMyBriefingAsset, listMyBriefingAssets, uploadMyBriefingAsset, type BriefingAsset } from '../lib/briefingAssets';

const auth = vi.hoisted(() => ({ user: { id: 'customer-a', email: 'a@example.test' } as { id: string; email: string } | null, identityEpoch: 0 }));
const trackMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/analytics')>()),
  trackFunnelEvent: trackMock,
}));
vi.mock('../context/customerAuth', () => ({ useCustomerAuth: () => auth }));
vi.mock('../lib/briefingAssets', () => ({
  listMyBriefingAssets: vi.fn(), uploadMyBriefingAsset: vi.fn(), deleteMyBriefingAsset: vi.fn(),
  briefingAssetValidationError: () => null, MAX_BRIEFING_ASSETS: 10,
}));

const asset: BriefingAsset = { id: 'asset-a', name: 'marca-privada-a.png', path: 'a/file.png', kind: 'logo', mimeType: 'image/png', sizeBytes: 100, quoteRequestId: null, verifiedAt: '2026-09-22T12:00:00Z', createdAt: '', expiresAt: '' };

describe('privacidade de anexos durante troca de sessão', () => {
  beforeEach(() => {
    auth.user = { id: 'customer-a', email: 'a@example.test' };
    auth.identityEpoch = 0;
    vi.mocked(listMyBriefingAssets).mockResolvedValue([]);
    trackMock.mockClear();
  });
  afterEach(() => { cleanup(); vi.resetAllMocks(); });

  it.each(['logout', 'troca de conta', 'nova sessão da mesma conta'])('ignora upload da sessão anterior após %s', async (scenario) => {
    let finishUpload!: (value: BriefingAsset) => void;
    vi.mocked(uploadMyBriefingAsset).mockReturnValue(new Promise((resolve) => { finishUpload = resolve; }));
    const onChange = vi.fn();
    const ui = () => <MemoryRouter><BriefingAssetUploader value={[]} onChange={onChange} contactEmail="" /></MemoryRouter>;
    const view = render(ui());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Enviar logo ou referência'), { target: { files: [new File(['test'], 'logo.png', { type: 'image/png' })] } });
    expect(uploadMyBriefingAsset).toHaveBeenCalledOnce();
    auth.user = scenario === 'logout' ? null : { id: scenario === 'troca de conta' ? 'customer-b' : 'customer-a', email: 'b@example.test' };
    auth.identityEpoch += 1;
    view.rerender(ui());
    await act(async () => { finishUpload(asset); });
    expect(screen.queryByText(asset.name)).not.toBeInTheDocument();
    expect(onChange.mock.calls.some(([ids]) => (ids as string[]).includes(asset.id))).toBe(false);
  });

  it('registra briefing_asset_uploaded com faixa de tamanho, nunca o byte exato', async () => {
    vi.mocked(uploadMyBriefingAsset).mockResolvedValue(asset);
    render(<MemoryRouter><BriefingAssetUploader value={[]} onChange={vi.fn()} contactEmail="" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeEnabled());

    fireEvent.change(screen.getByLabelText('Enviar logo ou referência'), { target: { files: [new File([new Uint8Array(2048)], 'logo.png', { type: 'image/png' })] } });

    await waitFor(() => expect(trackMock).toHaveBeenCalledWith('briefing_asset_uploaded', { kind: 'logo', mime: 'image/png', size_band: 'ate-1mb' }));
  });

  it('não registra briefing_asset_uploaded quando o envio é barrado pela sessão', async () => {
    vi.mocked(uploadMyBriefingAsset).mockRejectedValue(new Error('sessão expirada'));
    render(<MemoryRouter><BriefingAssetUploader value={[]} onChange={vi.fn()} contactEmail="" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeEnabled());

    fireEvent.change(screen.getByLabelText('Enviar logo ou referência'), { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } });

    await waitFor(() => expect(screen.getByText('sessão expirada')).toBeInTheDocument());
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('mantém o upload da sessão atual disponível para selecionar', async () => {
    vi.mocked(uploadMyBriefingAsset).mockResolvedValue(asset);
    const onChange = vi.fn();
    render(<MemoryRouter><BriefingAssetUploader value={[]} onChange={onChange} contactEmail="" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Enviar logo ou referência'), { target: { files: [new File(['test'], 'logo.png', { type: 'image/png' })] } });
    expect(await screen.findByText(asset.name)).toBeVisible();
    expect(onChange).toHaveBeenLastCalledWith([asset.id]);
  });

  it('não restaura anexos da sessão anterior após renovar a mesma conta', async () => {
    vi.mocked(listMyBriefingAssets).mockResolvedValue([asset]);
    const onChange = vi.fn();
    const ui = () => <MemoryRouter><BriefingAssetUploader value={[asset.id]} onChange={onChange} contactEmail="" /></MemoryRouter>;
    const view = render(ui());
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([asset.id]));

    auth.identityEpoch += 1;
    view.rerender(ui());

    await waitFor(() => expect(listMyBriefingAssets).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]));
  });

  it('mantém arquivo antigo não verificado indisponível para seleção, mas permite removê-lo', async () => {
    const pending = { ...asset, id: 'asset-pendente', verifiedAt: null };
    vi.mocked(listMyBriefingAssets).mockResolvedValue([pending]);
    vi.mocked(deleteMyBriefingAsset).mockResolvedValue();
    const onChange = vi.fn();
    render(<MemoryRouter><BriefingAssetUploader value={[]} onChange={onChange} contactEmail="" /></MemoryRouter>);

    expect(await screen.findByText(pending.name)).toBeVisible();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `Remover ${pending.name}` }));

    await waitFor(() => expect(deleteMyBriefingAsset).toHaveBeenCalledWith(pending));
    await waitFor(() => expect(screen.queryByText(pending.name)).not.toBeInTheDocument());
  });
});
