import { ArrowRight, Clock3, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConversationForm } from '../components/ConversationForm';
import { Seo } from '../components/Seo';

export default function ContactPage() {
  return (
    <>
      <Seo title="Contato" description="Fale com a Promo Brindes sobre sua próxima ação de brindes corporativos." path="/contato" />
      <header className="content-hero">
        <div className="container content-hero__grid">
          <div><span className="section-kicker">Vamos conversar</span><h1>Uma boa ideia começa com um bom briefing.</h1></div>
          <p>Se você já sabe o que procura, conte para a gente. Se ainda não sabe, nossa equipe ajuda a transformar o contexto da sua ação em possibilidades.</p>
        </div>
      </header>
      <section className="section contact-section">
        <div className="container contact-grid">
          <div className="contact-card contact-card--primary"><span><Phone /></span><small>Telefone</small><a href="tel:+551146375517">(11) 4637-5517</a><p>Para conversar diretamente com a equipe.</p></div>
          <div className="contact-card"><span><Mail /></span><small>E-mail</small><a href="mailto:adm01@promobrindes.com.br">adm01@promobrindes.com.br</a><p>Envie seu briefing ou uma seleção de referências.</p></div>
          <div className="contact-card"><span><MapPin /></span><small>Localização</small><strong>São Paulo · SP</strong><p>Atendimento comercial a partir de São Paulo.</p></div>
          <div className="contact-card"><span><Clock3 /></span><small>Comece quando quiser</small><strong>Catálogo sempre disponível</strong><p>Monte sua seleção no seu tempo e envie tudo junto.</p></div>
        </div>
      </section>
      <ConversationForm />
      <section className="contact-prompt"><div className="container contact-prompt__inner"><div><span className="section-kicker section-kicker--light">Prefere começar pelos produtos?</span><h2>Monte uma seleção visual antes de falar com a equipe.</h2><p>Você envia códigos, cores e quantidades em uma única solicitação.</p></div><Link className="button button--light button--large" to="/catalogo">Abrir catálogo <ArrowRight size={18} /></Link></div></section>
    </>
  );
}
