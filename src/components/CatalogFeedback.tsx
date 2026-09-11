import { AlertCircle, PackageSearch, RefreshCw } from 'lucide-react';

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" role="status" aria-label="Carregando produtos" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="product-skeleton" key={index} aria-hidden="true">
          <div className="skeleton skeleton--image" />
          <div className="product-skeleton__body">
            <div className="skeleton skeleton--eyebrow" />
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--button" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CatalogError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="catalog-message" role="alert">
      <span className="catalog-message__icon"><AlertCircle size={26} /></span>
      <h2>O catálogo fez uma pausa.</h2>
      <p>{message}</p>
      {onRetry && <button type="button" className="button button--outline" onClick={onRetry}><RefreshCw size={17} /> Tentar novamente</button>}
    </div>
  );
}

export function CatalogEmpty({ onClear, suggestion, onApplySuggestion }: { onClear?: () => void; suggestion?: string | null; onApplySuggestion?: () => void }) {
  return (
    <div className="catalog-message">
      <span className="catalog-message__icon"><PackageSearch size={28} /></span>
      <h2>Nenhum produto por aqui.</h2>
      <p>Tente um termo mais amplo ou remova alguns filtros da busca.</p>
      {suggestion && onApplySuggestion && <button type="button" className="text-button" onClick={onApplySuggestion}>Você quis dizer “{suggestion}”?</button>}
      {onClear && <button type="button" className="button button--outline" onClick={onClear}>Limpar filtros</button>}
    </div>
  );
}
