// Gera as capas sociais 1200x630 de cada colecao de /catalogos.
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
const siteLabel = 'promo-brindes-v1.vercel.app/catalogos';

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

async function fontFace(family, file) {
  const buffer = await readFile(join(root, 'node_modules', '@fontsource', file));
  return `url(data:font/woff2;base64,${buffer.toString('base64')}) format('woff2')`;
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cardHtml(collection, fonts) {
  const { background, accent, ink } = collection.palette;
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
<div class="top"><span class="wordmark">Promo Brindes</span><span class="eyebrow">${escapeHtml(collection.eyebrow)}</span></div>
<main><h1>${escapeHtml(collection.title)}</h1><p>${escapeHtml(collection.description)}</p></main>
<footer><span class="rule"></span><span class="site">${siteLabel}</span></footer>
</body></html>`;
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
    for (const collection of collections) {
      await page.setContent(cardHtml(collection, fonts), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      // Os blobs decorativos são absolutos e passam da caixa de propósito; o que
      // não pode acontecer é o texto encostar no rodapé.
      const layout = await page.evaluate(() => {
        const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
        return { mainBottom: box('main')?.bottom ?? 0, footerTop: box('footer')?.top ?? 0 };
      });
      if (layout.mainBottom > layout.footerTop) throw new Error(`Textos vazam do card de ${collection.id}: revise o tamanho da fonte.`);
      const target = join(outDir, `colecao-${collection.id}.png`);
      await page.screenshot({ path: target, type: 'png' });
      const { size } = await stat(target);
      console.log(`colecao-${collection.id}.png ${(size / 1024).toFixed(1)}kB`);
    }
  } finally {
    await browser.close();
  }
}

await main();