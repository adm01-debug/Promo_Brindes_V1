// Gera as capas sociais 1200x630 das colecoes de /catalogos e das datas da agenda.
// A lista abaixo espelha src/lib/catalogLibrary.ts (id, eyebrow, titulo,
// descricao e paleta). O mapa de runtime e shared/socialImages.ts; o teste
// tests/api/site-page.test.ts falha se um id ficar sem arquivo em public/images/og.
// Uso: npm run assets:social-cards
/* global document */
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'public', 'images', 'og');
const catalogsSiteLabel = 'promo-brindes-v1.vercel.app/catalogos';
const occasionsSiteLabel = 'promo-brindes-v1.vercel.app/datas-comemorativas';

const collections = [
  { id: 'onboarding-com-cultura', eyebrow: 'People experience', title: 'Onboarding com cultura', description: 'Boas-vindas que apresentam a empresa antes mesmo da primeira reunião.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'eventos-que-continuam', eyebrow: 'Live marketing', title: 'Eventos que continuam', description: 'Produtos úteis e compartilháveis para a experiência continuar depois do credenciamento.', palette: { background: '#ff6b5f', accent: '#d9ff3f', ink: '#121511' } },
  { id: 'reconhecimento-com-desejo', eyebrow: 'Employer branding', title: 'Reconhecimento com desejo', description: 'Presentes à altura de metas, marcos de carreira e conquistas que merecem memória.', palette: { background: '#111411', accent: '#d9ff3f', ink: '#f7f4ea' } },
  { id: 'relacionamento-que-fica', eyebrow: 'Brand love', title: 'Relacionamento que fica', description: 'Ideias para clientes e parceiros levarem a sua marca para a rotina.', palette: { background: '#4844ff', accent: '#ff8d80', ink: '#ffffff' } },
  { id: 'novas-tendencias', eyebrow: 'Radar de novidades', title: 'Tendências', description: 'Lançamentos e achados recentes para quem quer fugir do briefing previsível.', palette: { background: '#f6f1e7', accent: '#4844ff', ink: '#121511' } },
  { id: 'escolhas-de-menor-impacto', eyebrow: 'Sustentabilidade', title: 'Escolhas de menor impacto', description: 'Materiais e ideias para alinhar utilidade, mensagem e escolhas mais conscientes.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'tech-que-resolve', eyebrow: 'Utilidade primeiro', title: 'Tech que resolve', description: 'Tecnologia para mesa, mobilidade e rotina — com função antes do efeito.', palette: { background: '#dbe4ff', accent: '#4844ff', ink: '#121511' } },
  { id: 'celebracoes-com-significado', eyebrow: 'Calendário afetivo', title: 'Celebrações com significado', description: 'Datas especiais, encerramentos de ciclo e encontros que pedem algo além do protocolo.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'kits-prontos-para-combinar', eyebrow: 'Mix & match', title: 'Kits prontos para combinar', description: 'Pontos de partida para compor experiências com diferentes produtos e embalagens.', palette: { background: '#f4e4bf', accent: '#ff6b5f', ink: '#121511' } },
  { id: 'sua-marca-em-cena', eyebrow: 'Personalização', title: 'Sua marca em cena', description: 'Produtos com potencial para receber a identidade da campanha e circular de verdade.', palette: { background: '#e6dcff', accent: '#d9ff3f', ink: '#121511' } },
];

// Capas das datas da agenda. A lista espelha api/_lib/curatedPagePreviews.ts
// (titulo e descricao) e src/lib/commemorativeDates.ts (eyebrow e kind). A paleta
// reaproveita, por kind, as cores ja aprovadas das colecoes: nenhuma cor nova.
const occasions = [
  { id: 'ano-novo', eyebrow: 'Recomeços', title: 'Ano Novo', description: 'Comece o ciclo com uma lembrança útil, otimista e alinhada à cultura da marca.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'volta-ao-trabalho', eyebrow: 'People experience', title: 'Volta ao trabalho', description: 'Acolha o reencontro do time com itens que apoiam uma rotina mais leve.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'carnaval', eyebrow: 'Cultura brasileira', title: 'Carnaval', description: 'Crie uma ativação vibrante com brindes práticos para eventos e celebrações.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'dia-da-mulher', eyebrow: '08 de março', title: 'Dia Internacional da Mulher', description: 'Construa uma ação relevante, cuidadosa e coerente com os valores da marca.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'dia-do-consumidor', eyebrow: '15 de março', title: 'Dia do Consumidor', description: 'Reconheça clientes com uma experiência que fortalece relacionamento e lembrança.', palette: { background: '#4844ff', accent: '#ff8d80', ink: '#ffffff' } },
  { id: 'dia-da-felicidade', eyebrow: '20 de março', title: 'Dia Internacional da Felicidade', description: 'Espalhe bem-estar e conexão com uma campanha leve e compartilhável.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'pascoa', eyebrow: 'Data móvel', title: 'Páscoa', description: 'Transforme a data em uma experiência de afeto, encontro e significado.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'dia-da-terra', eyebrow: '22 de abril', title: 'Dia da Terra', description: 'Conecte utilidade, educação e escolhas de menor impacto em uma ação coerente.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'dia-do-trabalho', eyebrow: '01 de maio', title: 'Dia do Trabalho', description: 'Valorize quem constrói resultados com reconhecimento presente na rotina.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'dia-do-marketing', eyebrow: '08 de maio', title: 'Dia do Profissional de Marketing', description: 'Celebre criatividade e estratégia com uma lembrança tão original quanto o time.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'dia-das-maes', eyebrow: '2º domingo de maio', title: 'Dia das Mães', description: 'Planeje uma homenagem sensível, inclusiva e carregada de significado.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'dia-da-industria', eyebrow: '25 de maio', title: 'Dia da Indústria', description: 'Fortaleça relações com clientes, parceiros e equipes que movem a produção.', palette: { background: '#4844ff', accent: '#ff8d80', ink: '#ffffff' } },
  { id: 'dia-do-meio-ambiente', eyebrow: '05 de junho', title: 'Dia Mundial do Meio Ambiente', description: 'Dê forma a compromissos ambientais com escolhas úteis e comunicação transparente.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'dia-dos-namorados', eyebrow: '12 de junho', title: 'Dia dos Namorados', description: 'Crie conexões afetivas com experiências que a pessoa queira guardar.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'festas-juninas', eyebrow: 'Temporada de junho', title: 'Festas Juninas', description: 'Leve cor, sabor e cultura brasileira para encontros de clientes e equipes.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'dia-do-amigo', eyebrow: '20 de julho', title: 'Dia do Amigo', description: 'Reforce vínculos importantes com gestos simples, úteis e memoráveis.', palette: { background: '#4844ff', accent: '#ff8d80', ink: '#ffffff' } },
  { id: 'dia-da-amizade', eyebrow: '30 de julho', title: 'Dia Internacional da Amizade', description: 'Celebre comunidades e relações que aproximam pessoas e marcas.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'dia-dos-pais', eyebrow: '2º domingo de agosto', title: 'Dia dos Pais', description: 'Desenvolva uma homenagem acolhedora e inclusiva para diferentes histórias.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'dia-do-estudante', eyebrow: '11 de agosto', title: 'Dia do Estudante', description: 'Inspire aprendizado e protagonismo com itens presentes na jornada.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'dia-do-estagiario', eyebrow: '18 de agosto', title: 'Dia do Estagiário', description: 'Reconheça talentos em formação e fortaleça a experiência de pertencimento.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'dia-do-cliente', eyebrow: '15 de setembro', title: 'Dia do Cliente', description: 'Agradeça a confiança com um presente que prolonga a relação com a marca.', palette: { background: '#4844ff', accent: '#ff8d80', ink: '#ffffff' } },
  { id: 'dia-da-arvore', eyebrow: '21 de setembro', title: 'Dia da Árvore', description: 'Crie uma campanha educativa ligada à regeneração e às escolhas conscientes.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'dia-da-secretaria', eyebrow: '30 de setembro', title: 'Dia da Secretária', description: 'Reconheça organização, cuidado e parceria com um presente pensado nos detalhes.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'dia-do-vendedor', eyebrow: '01 de outubro', title: 'Dia do Vendedor', description: 'Celebre quem conecta necessidades e soluções com energia e relacionamento.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'dia-das-criancas', eyebrow: '12 de outubro', title: 'Dia das Crianças', description: 'Planeje experiências alegres, seguras e adequadas ao público da campanha.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'dia-do-professor', eyebrow: '15 de outubro', title: 'Dia do Professor', description: 'Valorize quem transforma conhecimento em futuro com uma lembrança significativa.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
  { id: 'halloween', eyebrow: '31 de outubro', title: 'Halloween', description: 'Dê personalidade a eventos e ativações com uma campanha divertida e marcante.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'empreendedorismo-feminino', eyebrow: '19 de novembro', title: 'Dia do Empreendedorismo Feminino', description: 'Amplifique histórias, protagonismo e conexões com uma ação relevante.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'consciencia-negra', eyebrow: '20 de novembro', title: 'Dia da Consciência Negra', description: 'Planeje uma iniciativa respeitosa, representativa e alinhada a compromissos reais.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'black-friday', eyebrow: '4ª sexta de novembro', title: 'Black Friday', description: 'Crie uma ativação de alto impacto com utilidade além do momento promocional.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'dia-da-pessoa-com-deficiencia', eyebrow: '03 de dezembro', title: 'Dia Internacional da Pessoa com Deficiência', description: 'Promova inclusão com acessibilidade, escuta e escolhas coerentes.', palette: { background: '#bcebd0', accent: '#121511', ink: '#121511' } },
  { id: 'natal', eyebrow: '25 de dezembro', title: 'Natal', description: 'Encerre o ano com uma experiência afetiva que reconhece e aproxima.', palette: { background: '#ffd4dc', accent: '#ff553d', ink: '#121511' } },
  { id: 'confraternizacao', eyebrow: 'Temporada de dezembro', title: 'Confraternização de fim de ano', description: 'Celebre resultados e relações com um kit que traduz a cultura da empresa.', palette: { background: '#d9ff3f', accent: '#4844ff', ink: '#121511' } },
];

async function fontFace(family, file) {
  const buffer = await readFile(join(root, 'node_modules', '@fontsource', file));
  return `url(data:font/woff2;base64,${buffer.toString('base64')}) format('woff2')`;
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cardHtml(card, fonts, siteLabel) {
  const { background, accent, ink } = card.palette;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><style>
@font-face { font-family: 'Space Grotesk'; font-weight: 700; src: ${fonts.display}; }
@font-face { font-family: 'Space Grotesk'; font-weight: 500; src: ${fonts.displayMedium}; }
@font-face { font-family: 'Inter'; font-weight: 400; src: ${fonts.body}; }
@font-face { font-family: 'Inter'; font-weight: 600; src: ${fonts.bodySemi}; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; position: relative;
  background: ${background}; color: ${ink}; padding: 60px 72px 56px;
  display: flex; flex-direction: column; justify-content: space-between;
  font-family: 'Inter', system-ui, sans-serif; }
.blob { position: absolute; border-radius: 50%; background: ${accent}; opacity: 0.18; }
.blob-a { width: 420px; height: 420px; top: -170px; right: -110px; }
.blob-b { width: 260px; height: 260px; bottom: -120px; right: 180px; opacity: 0.12; }
.top { display: flex; align-items: center; justify-content: space-between; position: relative; }
.wordmark { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 23px;
  letter-spacing: 5px; text-transform: uppercase; }
.eyebrow { font-size: 17px; font-weight: 600; letter-spacing: 2.6px; text-transform: uppercase;
  border: 2px solid ${accent}; border-radius: 999px; padding: 10px 22px; }
main { position: relative; }
h1 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 82px;
  line-height: 1.02; letter-spacing: -1.6px; max-width: 1000px; }
p { margin-top: 26px; font-size: 27px; line-height: 1.38; max-width: 880px; opacity: 0.86; }
footer { display: flex; align-items: center; justify-content: space-between; position: relative; }
.rule { width: 132px; height: 8px; background: ${accent}; border-radius: 999px; }
.site { font-size: 18px; letter-spacing: 1.6px; text-transform: uppercase; opacity: 0.72; }
</style></head><body>
<div class="blob blob-a"></div><div class="blob blob-b"></div>
<div class="top"><span class="wordmark">Promo Brindes</span><span class="eyebrow">${escapeHtml(card.eyebrow)}</span></div>
<main><h1>${escapeHtml(card.title)}</h1><p>${escapeHtml(card.description)}</p></main>
<footer><span class="rule"></span><span class="site">${siteLabel}</span></footer>
</body></html>`;
}

async function renderCards(page, list, prefix, siteLabel, fonts) {
  for (const card of list) {
    await page.setContent(cardHtml(card, fonts, siteLabel), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // Os blobs decorativos são absolutos e passam da caixa de propósito; o que
    // não pode acontecer é o texto encostar no rodapé.
    const layout = await page.evaluate(() => {
      const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
      return { mainBottom: box('main')?.bottom ?? 0, footerTop: box('footer')?.top ?? 0 };
    });
    if (layout.mainBottom > layout.footerTop) throw new Error(`Textos vazam do card de ${card.id}: revise o tamanho da fonte.`);
    const target = join(outDir, `${prefix}-${card.id}.png`);
    await page.screenshot({ path: target, type: 'png' });
    const { size } = await stat(target);
    console.log(`${prefix}-${card.id}.png ${(size / 1024).toFixed(1)}kB`);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const fonts = {
    display: await fontFace('Space Grotesk', 'space-grotesk/files/space-grotesk-latin-700-normal.woff2'),
    displayMedium: await fontFace('Space Grotesk', 'space-grotesk/files/space-grotesk-latin-500-normal.woff2'),
    body: await fontFace('Inter', 'inter/files/inter-latin-400-normal.woff2'),
    bodySemi: await fontFace('Inter', 'inter/files/inter-latin-600-normal.woff2'),
  };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await renderCards(page, collections, 'colecao', catalogsSiteLabel, fonts);
    await renderCards(page, occasions, 'data', occasionsSiteLabel, fonts);
  } finally {
    await browser.close();
  }
}

await main();