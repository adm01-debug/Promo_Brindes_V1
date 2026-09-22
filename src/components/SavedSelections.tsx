import { Archive, ArrowRight, BookmarkPlus, RotateCcw, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuoteCart } from '../context/quoteCart';
import { deleteMySelection, hydrateMySelection, listMySelections, saveMySelection, setMySelectionArchived, type SavedSelection } from '../lib/customerSelections';

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
}

function errorLabel(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'selection_version_conflict') return 'Esta seleção mudou em outra aba ou dispositivo. Atualize a lista antes de tentar novamente.';
    if (error.message === 'selection_limit_reached') return 'Você atingiu o limite de 30 seleções. Exclua uma seleção antiga para salvar outra.';
    if (error.message === 'selection_catalog_changed') return 'O catálogo mudou: há produto ou variante indisponível nesta seleção. Sua seleção atual foi preservada.';
  }
  return 'Não conseguimos concluir esta ação agora. Sua seleção atual foi preservada.';
}

export function SavedSelections() {
  const cart = useQuoteCart();
  const [selections, setSelections] = useState<SavedSelection[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [title, setTitle] = useState(cart.selectionTitle || 'Minha seleção');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<{ type: 'restore' | 'delete'; selection: SavedSelection } | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void listMySelections(showArchived)
      .then((rows) => { if (active) setSelections(showArchived ? rows.filter((item) => item.archivedAt) : rows); })
      .catch((failure: unknown) => { if (active) setError(errorLabel(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [showArchived, retryKey]);

  useEffect(() => {
    if (!pendingAction) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setPendingAction(null); }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [pendingAction]);

  async function reload() {
    const rows = await listMySelections(showArchived);
    setSelections(showArchived ? rows.filter((item) => item.archivedAt) : rows);
  }

  async function act(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await reload();
      setNotice(success);
    } catch (failure) {
      setError(errorLabel(failure));
    } finally {
      setBusy(false);
    }
  }

  function saveNew(event: FormEvent) {
    event.preventDefault();
    if (!cart.itemCount) return;
    void act(() => saveMySelection(title, cart.items, cart.campaign), 'Seleção salva na sua conta. Ela poderá ser aberta em outro dispositivo.');
  }

  function openConfirmation(type: 'restore' | 'delete', selection: SavedSelection, trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setPendingAction({ type, selection });
  }

  async function restoreSelection(selection: SavedSelection) {
    await act(async () => {
      const items = await hydrateMySelection(selection);
      cart.restoreSavedSelection(items, selection.campaign, selection.title);
      cart.setDrawerOpen(true);
      setTitle(selection.title);
    }, 'Seleção restaurada. Confira os produtos antes de solicitar orçamento.');
  }

  async function confirmAction() {
    const pending = pendingAction;
    if (!pending) return;
    setPendingAction(null);
    if (pending.type === 'delete') {
      await act(() => deleteMySelection(pending.selection), 'Seleção excluída da sua conta.');
      return;
    }
    await restoreSelection(pending.selection);
  }

  return (
    <section className="saved-selections section" aria-labelledby="saved-selections-title">
      <div className="container">
        <div className="saved-selections__heading">
          <div><span className="section-kicker">Entre uma ideia e outra</span><h2 id="saved-selections-title">Suas seleções salvas</h2><p>Guarde referências na sua conta e retome o briefing em outro dispositivo. O orçamento só é enviado quando você confirmar.</p></div>
          <button type="button" className="saved-selections__toggle" onClick={() => setShowArchived((value) => !value)} aria-pressed={showArchived}>{showArchived ? 'Mostrar ativas' : 'Ver arquivadas'}</button>
        </div>

        {cart.itemCount > 0 && <form className="saved-selections__save" onSubmit={saveNew}>
          <div><label htmlFor="saved-selection-title">Nome para a seleção deste navegador</label><input id="saved-selection-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required /></div>
          <span>{cart.itemCount} {cart.itemCount === 1 ? 'produto selecionado' : 'produtos selecionados'} · salvar é uma escolha sua</span>
          <button className="button button--green" type="submit" disabled={busy || loading}><BookmarkPlus size={17} /> Salvar na minha conta</button>
        </form>}

        {error && <div className="saved-selections__message saved-selections__message--error" role="alert">{error}<button type="button" onClick={() => setRetryKey((value) => value + 1)}>Recarregar lista</button></div>}
        {notice && <p className="saved-selections__message" role="status">{notice}</p>}
        {loading && <p className="saved-selections__message" role="status">Carregando suas seleções…</p>}
        {!loading && !error && !selections.length && <div className="saved-selections__empty"><BookmarkPlus size={28} /><h3>{showArchived ? 'Nenhuma seleção arquivada.' : 'Sua próxima campanha pode começar aqui.'}</h3><p>{showArchived ? 'Quando você arquivar uma seleção, ela aparecerá aqui por até 90 dias.' : 'Salve os produtos que está comparando ou explore o catálogo para montar uma nova seleção.'}</p><Link to="/catalogo">Explorar catálogo <ArrowRight size={16} /></Link></div>}

        {!loading && !error && Boolean(selections.length) && <div className="saved-selections__grid">{selections.map((selection) => <article className="saved-selections__card" key={selection.id}>
          <span>{selection.archivedAt ? 'ARQUIVADA' : 'PRONTA PARA RETOMAR'}</span>
          <h3>{selection.title}</h3>
          <p>{selection.references.length} {selection.references.length === 1 ? 'produto' : 'produtos'} · Atualizada em {dateLabel(selection.updatedAt)}</p>
          <div className="saved-selections__actions">
            {!selection.archivedAt && <button type="button" disabled={busy} onClick={(event) => cart.itemCount ? openConfirmation('restore', selection, event.currentTarget) : void restoreSelection(selection)}>Retomar seleção <ArrowRight size={15} /></button>}
            {!selection.archivedAt && cart.itemCount > 0 && <button type="button" disabled={busy} onClick={() => void act(() => saveMySelection(selection.title, cart.items, cart.campaign, selection), 'Seleção atualizada na sua conta.')}>Atualizar com a seleção atual</button>}
            <button type="button" disabled={busy} onClick={() => void act(() => setMySelectionArchived(selection, !selection.archivedAt), selection.archivedAt ? 'Seleção restaurada para a lista ativa.' : 'Seleção arquivada por até 90 dias.')}>
              {selection.archivedAt ? <RotateCcw size={15} /> : <Archive size={15} />}{selection.archivedAt ? 'Desarquivar' : 'Arquivar'}
            </button>
            <button type="button" disabled={busy} onClick={(event) => openConfirmation('delete', selection, event.currentTarget)}><Trash2 size={15} /> Excluir</button>
          </div>
        </article>)}</div>}
      </div>

      {pendingAction && <div className="saved-selections__dialog-backdrop">
        <div ref={dialogRef} className="saved-selections__dialog" role="alertdialog" aria-modal="true" aria-labelledby="selection-confirm-title" aria-describedby="selection-confirm-description">
          <h2 id="selection-confirm-title">{pendingAction.type === 'delete' ? 'Excluir esta seleção?' : 'Trocar a seleção atual?'}</h2>
          <p id="selection-confirm-description">{pendingAction.type === 'delete' ? 'A seleção salva será removida da sua conta. Os produtos que estão no carrinho deste navegador continuarão lá.' : 'Os produtos deste navegador serão substituídos pela seleção salva. Você pode salvá-los antes de continuar.'}</p>
          <div><button ref={cancelRef} type="button" onClick={() => setPendingAction(null)}>Cancelar</button><button type="button" onClick={() => void confirmAction()}>{pendingAction.type === 'delete' ? 'Excluir seleção' : 'Trocar seleção'}</button></div>
        </div>
      </div>}
    </section>
  );

}
