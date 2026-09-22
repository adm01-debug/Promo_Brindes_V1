import type { CatalogProduct, QuoteItem } from '../types';
import { MAX_QUOTE_ITEMS, normalizeQuoteItems } from './quoteItems';

export interface KitSlotDefinition { id: string; label: string; optional?: boolean; }
export interface KitTemplate { id: string; name: string; description: string; slots: KitSlotDefinition[]; }
export interface KitComponent { slotId: string; slotLabel: string; product: CatalogProduct; unitsPerKit: number; }

// Estruturas neutras de briefing: não recomendam SKU, preço, embalagem ou regra
// comercial. A pessoa escolhe cada produto no catálogo público.
export const kitTemplates: KitTemplate[] = [
  { id: 'essencial', name: 'Dupla essencial', description: 'Dois componentes para uma composição direta.', slots: [{ id: 'principal', label: 'Item principal' }, { id: 'apoio', label: 'Item complementar' }] },
  { id: 'experiencia', name: 'Trio de experiência', description: 'Três pontos de contato para ampliar a experiência.', slots: [{ id: 'principal', label: 'Item principal' }, { id: 'rotina', label: 'Item de rotina' }, { id: 'surpresa', label: 'Item surpresa' }] },
  { id: 'completo', name: 'Composição flexível', description: 'Dois componentes essenciais e até dois extras opcionais.', slots: [{ id: 'principal', label: 'Item principal' }, { id: 'rotina', label: 'Item de rotina' }, { id: 'apoio', label: 'Item complementar', optional: true }, { id: 'surpresa', label: 'Item surpresa', optional: true }] },
];

export function missingRequiredKitSlots(template: KitTemplate, components: KitComponent[]): KitSlotDefinition[] {
  const filledSlots = new Set(components.map((component) => component.slotId));
  return template.slots.filter((slot) => !slot.optional && !filledSlots.has(slot.id));
}

export function minimumKitQuantity(components: KitComponent[]): number {
  return components.reduce((minimum, component) => {
    const units = Math.max(1, Math.min(100, Math.round(component.unitsPerKit)));
    return Math.max(minimum, Math.ceil(component.product.minQuantity / units));
  }, 1);
}

export function kitTotalUnits(quantity: number, components: KitComponent[]): number {
  return components.reduce((total, component) => total + quantity * component.unitsPerKit, 0);
}

export function buildKitQuoteItems(options: {
  id: string;
  name: string;
  quantity: number;
  components: KitComponent[];
}): QuoteItem[] {
  const name = options.name.trim().slice(0, 100);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(options.id)
    || !name || !Number.isInteger(options.quantity) || options.quantity < minimumKitQuantity(options.components)
    || options.quantity > 999_999 || options.components.length < 2 || options.components.length > 8) return [];

  const uniqueProducts = new Set<string>();
  const items = options.components.flatMap((component) => {
    if (uniqueProducts.has(component.product.id) || !Number.isInteger(component.unitsPerKit)
      || component.unitsPerKit < 1 || component.unitsPerKit > 100) return [];
    uniqueProducts.add(component.product.id);
    return [{
      key: `${component.product.id}::sem-cor`,
      productId: component.product.id,
      slug: component.product.slug,
      name: component.product.name,
      sku: component.product.sku,
      imageUrl: component.product.imageUrl,
      minQuantity: component.product.minQuantity,
      quantity: options.quantity * component.unitsPerKit,
      kitGroupId: options.id,
      kitName: name,
      kitQuantity: options.quantity,
      unitsPerKit: component.unitsPerKit,
    } satisfies QuoteItem];
  });
  if (items.length !== options.components.length) return [];
  const normalized = normalizeQuoteItems(items);
  // A normalização pode limitar quantidades ou remover metadados inválidos.
  // Nunca transformar uma composição inválida em itens avulsos silenciosamente.
  return normalized.length === items.length && normalized.every((item) => item.kitGroupId === options.id)
    ? normalized : [];
}

export function mergeKitIntoSelection(current: QuoteItem[], kitItems: QuoteItem[]): QuoteItem[] | null {
  const kitGroupId = kitItems[0]?.kitGroupId;
  if (!kitGroupId || kitItems.some((item) => item.kitGroupId !== kitGroupId)) return null;
  const withoutSameGroup = normalizeQuoteItems(current).filter((item) => item.kitGroupId !== kitGroupId);
  const occupiedKeys = new Set(withoutSameGroup.map((item) => item.key));
  // Um mesmo produto/variante não pode representar simultaneamente um item
  // avulso e um componente de kit. Mesclar os dois perderia a semântica da
  // composição e produziria uma quantidade ambígua no orçamento.
  if (kitItems.some((item) => occupiedKeys.has(item.key))) return null;
  if (withoutSameGroup.length + kitItems.length > MAX_QUOTE_ITEMS) return null;
  return normalizeQuoteItems([...withoutSameGroup, ...kitItems]);
}
