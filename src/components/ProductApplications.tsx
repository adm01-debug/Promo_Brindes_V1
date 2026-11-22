import { Lightbulb } from 'lucide-react';
import { productApplicationIdeas, productReasons } from '../lib/productApplications';
import type { CampaignBrief, CatalogProduct } from '../types';

export function ProductApplications({ product, campaign }: { product: CatalogProduct; campaign?: CampaignBrief }) {
  const reasons = productReasons(product);
  const ideas = productApplicationIdeas(product, campaign);
  if (reasons.length === 0 && ideas.length === 0) return null;

  // Peso ou altura podem gerar ideias sem gerar motivos. Nesse caso o bloco dos
  // motivos não existe, então o título dos motivos também não: o painel precisa
  // de outro rótulo e "Ideias de uso" sobe para h2 para não pular nível.
  const headingId = reasons.length > 0 ? 'product-applications-title' : 'product-ideas-title';
  const IdeasHeading = reasons.length > 0 ? 'h3' : 'h2';

  return (
    <section className="product-applications product-panel" aria-labelledby={headingId}>
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
          <IdeasHeading id="product-ideas-title"><Lightbulb aria-hidden="true" /> Ideias de uso</IdeasHeading>
          <ul className="product-ideas">
            {ideas.map((idea) => <li key={idea}>{idea}</li>)}
          </ul>
          <p className="product-ideas__note">Sugestões editoriais do nosso time de curadoria. Não são garantia de resultado da campanha nem alteram as características descritas do produto.</p>
        </div>
      )}
    </section>
  );
}
