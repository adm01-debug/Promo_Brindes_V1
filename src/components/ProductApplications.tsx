import { Lightbulb } from 'lucide-react';
import { productApplicationIdeas, productReasons } from '../lib/productApplications';
import type { CatalogProduct } from '../types';

export function ProductApplications({ product }: { product: CatalogProduct }) {
  const reasons = productReasons(product);
  const ideas = productApplicationIdeas(product);
  if (reasons.length === 0 && ideas.length === 0) return null;

  return (
    <section className="product-applications product-panel" aria-labelledby="product-applications-title">
      {reasons.length > 0 && (
        <div>
          <h2 id="product-applications-title">Por que este produto</h2>
          <p className="product-applications__lead">Motivos tirados da ficha do item: só entra aqui o que está no cadastro do fornecedor.</p>
          <ul className="product-reasons">
            {reasons.map((reason) => (
              <li key={reason.title}>
                <strong>{reason.title}</strong>
                <span>{reason.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ideas.length > 0 && (
        <div>
          <h3><Lightbulb aria-hidden="true" /> Ideias de uso</h3>
          <ul className="product-ideas">
            {ideas.map((idea) => <li key={idea}>{idea}</li>)}
          </ul>
          <p className="product-ideas__note">Sugestões editoriais do nosso time de curadoria. Não são garantia de resultado da campanha nem alteram as características descritas do produto.</p>
        </div>
      )}
    </section>
  );
}
