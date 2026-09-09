import { ArrowRight, CheckCircle2, Headphones, PackageSearch, Palette, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';

export default function AboutPage() {
  return (
    <>
      <Seo title="Como trabalhamos" description="Conheça a jornada consultiva da Promo Brindes, da escolha dos produtos à proposta personalizada." path="/sobre" />
      <header className="content-hero content-hero--green">
        <div className="container content-hero__grid">
          <div><span className="section-kicker">Como trabalhamos</span><h1>Sua ideia vem primeiro. O produto vem depois.</h1></div>
          <p>O catálogo é o ponto de partida. A melhor escolha aparece quando entendemos a ação, o público, a quantidade e o momento da sua marca.</p>
        </div>
      </header>
      <section className="section about-intro">
        <div className="container about-intro__grid">
          <div><span className="section-kicker">Atendimento consultivo</span><h2>Menos “adicionar ao carrinho”. Mais escolher com intenção.</h2></div>
          <div><p>Este site não é uma loja virtual. Você monta uma seleção de referências e compartilha um briefing simples. A partir daí, nosso time de especialistas avalia possibilidades de personalização, disponibilidade e condições para preparar uma proposta coerente com a sua necessidade.</p><p>Assim, cada decisão considera o contexto real da ação — sem preço genérico, sem checkout apressado e sem esconder as variáveis que importam.</p></div>
        </div>
      </section>
      <section className="section about-process">
        <div className="container">
          <div className="section-heading"><span className="section-kicker">A jornada</span><h2>Clareza em cada etapa.</h2></div>
          <ol className="about-steps">
            <li><span>01</span><PackageSearch /><h3>Descoberta</h3><p>Você explora o catálogo e reúne os itens que fazem sentido.</p></li>
            <li><span>02</span><Send /><h3>Briefing</h3><p>Informa quantidade, prazo e o contexto da campanha ou presente.</p></li>
            <li><span>03</span><Headphones /><h3>Curadoria</h3><p>Nosso time de especialistas analisa alternativas e ajuda a refinar a escolha.</p></li>
            <li><span>04</span><Palette /><h3>Personalização</h3><p>Alinhamos a aplicação da sua marca e os detalhes da proposta.</p></li>
          </ol>
        </div>
      </section>
      <section className="principles-section section">
        <div className="container principles-grid">
          <div className="principles-title"><span className="section-kicker section-kicker--light">O que orienta a escolha</span><h2>Bom brinde é aquele que encontra um lugar na rotina.</h2></div>
          <ul><li><CheckCircle2 /><div><strong>Utilidade real</strong><span>Produtos que fazem sentido para quem recebe.</span></div></li><li><CheckCircle2 /><div><strong>Coerência com a marca</strong><span>Forma, material e acabamento alinhados à mensagem.</span></div></li><li><CheckCircle2 /><div><strong>Experiência completa</strong><span>Da primeira busca à conversa com nosso time de especialistas.</span></div></li></ul>
        </div>
      </section>
      <section className="final-cta"><div className="container final-cta__inner"><div><span className="section-kicker">Agora é com você</span><h2>Que lembrança sua marca quer deixar?</h2></div><Link className="button button--green button--large" to="/catalogo">Explorar possibilidades <ArrowRight size={19} /></Link></div></section>
    </>
  );
}
