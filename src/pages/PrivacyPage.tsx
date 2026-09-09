import { Seo } from '../components/Seo';

export default function PrivacyPage() {
  return (
    <>
      <Seo title="Aviso de privacidade" path="/privacidade" />
      <header className="legal-hero"><div className="container"><span className="section-kicker">Transparência</span><h1>Aviso de privacidade</h1><p>Última atualização: setembro de 2026</p></div></header>
      <article className="container legal-content">
        <section><h2>1. Dados usados na solicitação</h2><p>Quando você pede um orçamento, podemos receber nome, empresa, e-mail, telefone, cidade, prazo desejado, observações e a lista de produtos selecionados. Solicitamos apenas os dados necessários para entender o pedido e retornar o contato.</p></section>
        <section><h2>2. Finalidade</h2><p>Usamos essas informações para analisar a solicitação, preparar uma proposta, esclarecer detalhes e manter a comunicação comercial relacionada ao seu pedido.</p></section>
        <section><h2>3. Catálogo e armazenamento local</h2><p>A seleção de produtos pode ser salva no armazenamento local do seu navegador para que ela não seja perdida ao fechar ou atualizar a página. Essa seleção não contém preço nem dados pessoais e pode ser removida a qualquer momento em “Meus saves”.</p></section>
        <section><h2>4. Métricas de uso</h2><p>Usamos o Vercel Web Analytics para entender, de forma agregada e sem cookies, quais páginas e etapas da jornada funcionam melhor. Antes do envio, removemos parâmetros e fragmentos das URLs. Eventos do funil aceitam somente dados operacionais predefinidos, como quantidade de resultados, número de filtros e identificador público do produto; não enviamos nomes, e-mails, telefones, observações nem o texto pesquisado. Consulte a <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noreferrer">documentação de privacidade da Vercel</a>.</p></section>
        <section><h2>5. Armazenamento e segurança</h2><p>As solicitações são mantidas em ambiente separado do sistema interno e protegidas por controles de acesso server-side. Conservamos os dados somente pelo período necessário ao atendimento, ao relacionamento decorrente da solicitação e ao cumprimento de obrigações aplicáveis; depois, eles devem ser eliminados ou anonimizados.</p></section>
        <section><h2>6. Compartilhamento</h2><p>Os dados não são comercializados. Eles podem ser processados por fornecedores de infraestrutura estritamente necessários à operação, mensuração e atendimento, observadas as medidas de segurança aplicáveis.</p></section>
        <section><h2>7. Confirmações por e-mail e WhatsApp</h2><p>Uma confirmação de recebimento por e-mail pode acompanhar a solicitação. Mensagens automatizadas pelo WhatsApp somente devem ser ativadas após uma escolha específica do titular; informar um telefone não autoriza, por si só, campanhas promocionais.</p></section>
        <section><h2>8. Seus direitos</h2><p>Você pode solicitar confirmação de tratamento, acesso, correção ou eliminação dos dados, quando aplicável, além de retirar consentimentos relacionados ao contato.</p></section>
        <section><h2>9. Contato</h2><p>Para dúvidas sobre privacidade, escreva para <a href="mailto:adm01@promobrindes.com.br">adm01@promobrindes.com.br</a> ou ligue para <a href="tel:+551146375517">(11) 4637-5517</a>.</p></section>
      </article>
    </>
  );
}
