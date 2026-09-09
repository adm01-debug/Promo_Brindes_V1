import { Plus } from 'lucide-react';
import { trackFunnelEvent } from '../lib/analytics';

type FaqScope = 'catalog' | 'product' | 'quote';

const FAQS: Record<FaqScope, Array<{ id: string; question: string; answer: string }>> = {
  catalog: [
    { id: 'price', question: 'Por que os produtos não mostram preço?', answer: 'O valor muda conforme quantidade, técnica de personalização, acabamento, embalagem, frete e prazo. Você salva as referências e recebe uma proposta feita para o seu cenário, sem checkout e sem compromisso.' },
    { id: 'availability', question: 'Tudo o que aparece pode entrar no orçamento?', answer: 'Todos os produtos ativos podem ser consultados. Como estoques de fornecedores mudam e não são publicados como promessa, disponibilidade, cor e prazo são confirmados pela equipe durante a proposta.' },
    { id: 'selection', question: 'Posso misturar categorias e ideias?', answer: 'Sim. Seu moodboard pode reunir produtos diferentes. Depois você ajusta quantidade e contexto em um único briefing para a curadoria entender o conceito completo.' },
  ],
  product: [
    { id: 'logo', question: 'Como descubro se minha logo funciona neste produto?', answer: 'Salve o item e conte no briefing como imagina a aplicação. A equipe cruza material, área disponível, quantidade de cores e técnica indicada antes de fechar a proposta.' },
    { id: 'proof', question: 'A personalização é aprovada antes da produção?', answer: 'O fluxo e as etapas de aprovação são alinhados na proposta. Quando aplicável, a arte e a prova digital são validadas antes da produção.' },
    { id: 'sample', question: 'Posso consultar amostra, outras cores ou embalagem?', answer: 'Sim. Informe essa necessidade no briefing. Amostra, variantes, apresentação individual e prazo dependem do produto e são confirmados pela equipe.' },
  ],
  quote: [
    { id: 'next', question: 'O que acontece depois que eu enviar?', answer: 'A solicitação recebe um protocolo e a equipe analisa produtos, quantidades, personalização e prazo. O contato continua pelo e-mail ou WhatsApp informado no briefing.' },
    { id: 'commitment', question: 'Enviar o briefing cria algum compromisso?', answer: 'Não. Esta etapa não tem pagamento nem fecha pedido. Ela organiza sua seleção para que a Promo Brindes prepare uma proposta adequada.' },
    { id: 'changes', question: 'Posso mudar produtos e quantidades depois?', answer: 'Sim. A seleção é um ponto de partida. Alternativas, quantidades, cores e acabamentos podem ser ajustados com a equipe durante a curadoria.' },
  ],
};

const headings: Record<FaqScope, { kicker: string; title: string; copy: string }> = {
  catalog: { kicker: 'Antes de salvar', title: 'Dúvidas que não deveriam travar uma boa ideia.', copy: 'O catálogo inspira; a proposta confirma os detalhes operacionais.' },
  product: { kicker: 'Da ideia à execução', title: 'Detalhes que a curadoria confirma com você.', copy: 'Sem prometer o que depende de técnica, quantidade ou disponibilidade.' },
  quote: { kicker: 'Sem letras miúdas', title: 'O que acontece com o seu briefing.', copy: 'Um processo claro antes de qualquer decisão comercial.' },
};

export function ContextualFaq({ scope }: { scope: FaqScope }) {
  const heading = headings[scope];
  return (
    <section className={`contextual-faq contextual-faq--${scope}`} aria-labelledby={`faq-${scope}-title`}>
      <div className="contextual-faq__heading">
        <span className="section-kicker">{heading.kicker}</span>
        <h2 id={`faq-${scope}-title`}>{heading.title}</h2>
        <p>{heading.copy}</p>
      </div>
      <div className="contextual-faq__list">
        {FAQS[scope].map((item) => (
          <details
            key={item.id}
            onToggle={(event) => {
              if (event.currentTarget.open) trackFunnelEvent('faq_opened', { scope, question: item.id });
            }}
          >
            <summary><span>{item.question}</span><Plus size={20} aria-hidden="true" /></summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
