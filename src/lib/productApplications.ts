import type { CatalogProduct } from '../types';

export interface ProductReason {
  title: string;
  detail: string;
}

export interface ProductApplications {
  reasons: ProductReason[];
  ideas: string[];
}

const MATERIAL_LABELS: Record<string, string> = {
  aco: 'aço',
  aço: 'aço',
  'aco inox': 'aço inox',
  'aço inox': 'aço inox',
  aluminio: 'alumínio',
  'alumínio': 'alumínio',
  bambu: 'bambu',
  ceramica: 'cerâmica',
  'cerâmica': 'cerâmica',
  couro: 'couro',
  plastico: 'plástico',
  'plástico': 'plástico',
  silicone: 'silicone',
  vidro: 'vidro',
  madeira: 'madeira',
  papel: 'papel',
  poliester: 'poliéster',
  'poliéster': 'poliéster',
  algodao: 'algodão',
  'algodão': 'algodão',
  metal: 'metal',
  tecido: 'tecido',
};

const DURABLE_MATERIALS = new Set([
  'aco', 'aço', 'aco inox', 'aço inox', 'metal', 'aluminio', 'alumínio',
  'vidro', 'ceramica', 'cerâmica', 'couro', 'madeira', 'bambu', 'silicone',
]);

function normalizeMaterial(material: string): string {
  return material
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function productMaterialLabels(product: CatalogProduct): string[] {
  const labels = new Set<string>();
  for (const material of product.materials) {
    const key = material.trim().toLocaleLowerCase('pt-BR');
    const label = MATERIAL_LABELS[key] ?? MATERIAL_LABELS[normalizeMaterial(material)];
    if (label) labels.add(label);
  }
  return [...labels];
}

function isDurable(product: CatalogProduct): boolean {
  return product.materials.some((material) => DURABLE_MATERIALS.has(normalizeMaterial(material)));
}

function formatQuantity(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function productReasons(product: CatalogProduct): ProductReason[] {
  const reasons: ProductReason[] = [];
  const materials = productMaterialLabels(product);

  if (product.isKit) {
    reasons.push({
      title: 'Conjunto pronto para apresentar',
      detail: 'É um kit: chega como um conjunto e simplifica a entrega para o time ou para o cliente final.',
    });
  }

  if (product.allowsPersonalization) {
    reasons.push({
      title: 'Aceita a identidade da sua marca',
      detail: 'O cadastro do item permite personalização. Cor, gravação e arte final são confirmados pelo nosso time antes de produzir.',
    });
  }

  if (product.hasCommercialPackaging) {
    reasons.push({
      title: 'Já tem apresentação comercial',
      detail: 'Vem em embalagem individual, o que evita retrabalho e protege no transporte.',
    });
  }

  if (materials.length > 0) {
    reasons.push({
      title: `Materiais declarados: ${materials.join(', ')}`,
      detail: isDurable(product)
        ? 'Material durável segundo a ficha do fornecedor — costuma acompanhar a pessoa por mais tempo.'
        : 'Material informado na ficha do fornecedor; confirme acabamento e consulte a amostra antes de fechar a tiragem.',
    });
  }

  if (product.dimensions.capacityMl && product.dimensions.capacityMl >= 300) {
    reasons.push({
      title: `Capacidade de ${formatQuantity(product.dimensions.capacityMl)} ml`,
      detail: 'Volume grande o bastante para hidratação durante um dia inteiro fora do escritório.',
    });
  }

  if (product.minQuantity > 1) {
    reasons.push({
      title: `Tiragem a partir de ${formatQuantity(product.minQuantity)} unidades`,
      detail: 'Atenção ao mínimo: abaixo disso o pedido não é produzido. Use esta faixa para calibrar o orçamento.',
    });
  }

  if (product.isBestseller) {
    reasons.push({
      title: 'Escolhido com frequência por aqui',
      detail: 'Está entre os mais pedidos do catálogo — sai menos errado quando o público do brinde ainda é amplo.',
    });
  } else if (product.isFeatured) {
    reasons.push({
      title: 'Selecionado pela curadoria',
      detail: 'Faz parte da seleção destaque do catálogo, revisada pelo nosso time comercial.',
    });
  }

  if (product.isNew) {
    reasons.push({
      title: 'Novidade no catálogo',
      detail: 'Chegou há pouco: bom quando a campanha precisa de um item que o público ainda não viu.',
    });
  }

  if (product.colors.length > 1) {
    reasons.push({
      title: `${formatQuantity(product.colors.length)} cores cadastradas`,
      detail: 'Há variações suficientes para alinhar com o manual da marca ou segmentar por equipe.',
    });
  }

  return reasons.slice(0, 5);
}

export function productApplicationIdeas(product: CatalogProduct): string[] {
  const ideas: string[] = [];
  const materials = productMaterialLabels(product);
  const portable = Boolean(
    product.dimensions.capacityMl || product.dimensions.weightG || product.dimensions.heightCm,
  );

  if (product.dimensions.capacityMl) {
    ideas.push('Onboarding de equipe: entregue já preenchido ou acompanhado do kit de boas-vindas.');
    ideas.push('Campanha de saúde e bem-estar: reforça o hábito de se hidratar na rotina de trabalho.');
  }

  if (portable && !product.dimensions.capacityMl) {
    ideas.push('Kits de boas-vindas enviados pelo correio, porque o formato é fácil de embalar.');
  }

  if (product.allowsPersonalization) {
    ideas.push('Ação de relacionamento com cliente-chave: o item personalizado vira lembrança de um encontro específico.');
    ideas.push('Ativação em feira ou evento: personalização no mesmo dia da visita aumenta a retenção do contato.');
  }

  if (product.hasCommercialPackaging) {
    ideas.push('Brinde de fechamento de projeto: a embalagem individual permite entregar um por pessoa da diretoria.');
  }

  if (product.isKit) {
    ideas.push('Programa de reconhecimento: o conjunto completo funciona como prêmio de fim de ciclo.');
  }

  if (isDurable(product) && materials.length > 0) {
    ideas.push('Presente para time remoto: o material resistente sobrevive à rotina de uso diário fora do escritório.');
  }

  if (product.minQuantity >= 100) {
    ideas.push('Distribuição em evento grande, em que a tiragem mínima é consumida numa única ativação.');
  }

  const unique = [...new Set(ideas)];
  return unique.slice(0, 4);
}

export function productHasApplications(product: CatalogProduct): boolean {
  return productReasons(product).length > 0 || productApplicationIdeas(product).length > 0;
}
