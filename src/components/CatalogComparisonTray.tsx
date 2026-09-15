import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { replaceBrokenProductImage } from '../lib/images';
import type { CatalogProduct } from '../types';

function comparisonDimensions(product: CatalogProduct): string {
  const values = [product.dimensions.lengthCm, product.dimensions.widthCm, product.dimensions.heightCm]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? `${values.map((value) => value.toLocaleString('pt-BR')).join(' × ')} cm` : 'A confirmar';
}

interface CatalogComparisonTrayProps {
  comparison: CatalogProduct[];
  expanded: boolean;
  notice: string;
  onToggleExpanded(): void;
  onClear(): void;
  onRemove(product: CatalogProduct): void;
}

/** Painel local de decisão separado do radar para manter a página focada na busca. */
export function CatalogComparisonTray({ comparison, expanded, notice, onToggleExpanded, onClear, onRemove }: CatalogComparisonTrayProps) {
  if (!comparison.length) return null;
  return (
    <aside className={`compare-tray ${expanded ? 'is-expanded' : ''}`} aria-labelledby="compare-tray-title">
      <div className="container compare-tray__inner">
        <div className="compare-tray__header">
          <div><span>Comparação local</span><h2 id="compare-tray-title">{comparison.length} de 3 referências lado a lado</h2></div>
          <div className="compare-tray__header-actions">
            <button className="compare-tray__toggle" type="button" onClick={onToggleExpanded} aria-expanded={expanded} aria-controls="compare-tray-body">{expanded ? 'Ocultar comparação' : 'Ver comparação'}</button>
            <button type="button" onClick={onClear}>Limpar comparação</button>
          </div>
        </div>
        <div id="compare-tray-body" className="compare-tray__body">
          {notice && <p className="compare-tray__notice" role="status">{notice}</p>}
          <div className="compare-tray__items">
            {comparison.map((item) => (
              <article key={item.id} className="compare-tray__item">
                <img src={item.imageUrl} alt="" width="72" height="72" referrerPolicy="no-referrer" onError={replaceBrokenProductImage} />
                <div><Link to={`/produto/${item.slug}`}>{item.name}</Link><p>Cód. {item.sku} · {item.minQuantity > 1 ? `mín. ${item.minQuantity.toLocaleString('pt-BR')} un.` : 'quantidade a confirmar'}</p></div>
                <button type="button" onClick={() => onRemove(item)} aria-label={`Remover ${item.name} da comparação`}><X size={17} /></button>
              </article>
            ))}
          </div>
          {comparison.length > 1 && (
            <div className="compare-tray__table-wrap" role="region" tabIndex={0} aria-label="Tabela de comparação; deslize horizontalmente em telas pequenas">
              <table>
                <caption>Comparação de informações publicadas no catálogo</caption>
                <thead><tr><th scope="col">Critério</th>{comparison.map((item) => <th scope="col" key={item.id}><Link to={`/produto/${item.slug}`}>{item.name}</Link></th>)}</tr></thead>
                <tbody>
                  {([
                    ['Quantidade mínima', comparison.map((item) => item.minQuantity > 1 ? `${item.minQuantity.toLocaleString('pt-BR')} un.` : 'A confirmar')],
                    ['Personalização', comparison.map((item) => item.allowsPersonalization ? 'A confirmar com o briefing' : 'Consulte nosso time de especialistas')],
                    ['Cores publicadas', comparison.map((item) => item.colors.length ? `${item.colors.length} ${item.colors.length === 1 ? 'opção' : 'opções'}` : 'A confirmar')],
                    ['Materiais publicados', comparison.map((item) => item.materials.length ? item.materials.join(', ') : 'A confirmar')],
                    ['Dimensões', comparison.map(comparisonDimensions)],
                    ['Capacidade', comparison.map((item) => item.dimensions.capacityMl ? `${item.dimensions.capacityMl.toLocaleString('pt-BR')} ml` : 'Não publicada')],
                    ['Embalagem', comparison.map((item) => item.hasCommercialPackaging ? 'Individual publicada' : 'A confirmar')],
                  ] as Array<[string, string[]]>).map(([label, values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => {
                    const compared = comparison[index];
                    return compared ? <td key={compared.id} className={new Set(values).size > 1 ? 'is-different' : undefined}>{value}</td> : null;
                  })}</tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
