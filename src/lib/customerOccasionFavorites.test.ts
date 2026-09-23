import { afterEach, describe, expect, it, vi } from 'vitest';
import { listMyOccasionFavorites, setMyOccasionFavorite } from './customerOccasionFavorites';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./siteSupabase', () => ({ siteSupabase: { rpc } }));

describe('favoritos de datas na conta', () => {
  afterEach(() => rpc.mockReset());

  it('lê apenas IDs editoriais e elimina duplicidades', async () => {
    rpc.mockResolvedValue({ data: { items: ['dia-das-maes', 'natal', 'natal'] }, error: null });
    await expect(listMyOccasionFavorites()).resolves.toEqual(['dia-das-maes', 'natal']);
    expect(rpc).toHaveBeenCalledWith('list_my_occasion_favorites');
  });

  it('normaliza a escrita e exige confirmação idempotente do servidor', async () => {
    rpc.mockResolvedValue({ data: { saved: true }, error: null });
    await expect(setMyOccasionFavorite(' Natal ', true)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('set_my_occasion_favorite', { p_occasion_id: 'natal', p_saved: true });
  });

  it('rejeita payloads e identificadores que não podem representar uma data editorial', async () => {
    rpc.mockResolvedValue({ data: { items: ['<script>'] }, error: null });
    await expect(listMyOccasionFavorites()).rejects.toThrow('occasion_favorites_unavailable');
    await expect(setMyOccasionFavorite('natal<script>', true)).rejects.toThrow('invalid_occasion_id');
  });

  it('não confirma uma alteração quando a resposta é inconsistente', async () => {
    rpc.mockResolvedValue({ data: { saved: false }, error: null });
    await expect(setMyOccasionFavorite('natal', true)).rejects.toThrow('occasion_favorites_unavailable');
  });

  it('preserva o erro de limite para a interface orientar a pessoa', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'occasion_favorite_limit_reached' } });
    await expect(setMyOccasionFavorite('natal', true)).rejects.toThrow('occasion_favorite_limit_reached');
  });
});
