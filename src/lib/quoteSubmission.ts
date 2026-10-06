import type { CampaignBrief, QuoteItem } from '../types';

export interface QuoteSelectionSnapshot {
  items: QuoteItem[];
  campaign?: CampaignBrief;
  selectionTitle?: string;
}

function sameItem(left: QuoteItem, right: QuoteItem): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function sameQuoteSelectionContext(left: QuoteSelectionSnapshot, right: QuoteSelectionSnapshot): boolean {
  return left.selectionTitle === right.selectionTitle
    && JSON.stringify(left.campaign) === JSON.stringify(right.campaign);
}

/**
 * A referência do estado React muda em renders que não editaram a seleção
 * (por exemplo, ao alternar o estado de envio). A reconciliação pós-201
 * precisa comparar o conteúdo, nunca a identidade do objeto.
 */
export function sameQuoteSelection(left: QuoteSelectionSnapshot, right: QuoteSelectionSnapshot): boolean {
  return sameQuoteSelectionContext(left, right)
    && left.items.length === right.items.length
    && left.items.every((item, index) => {
      const comparable = right.items[index];
      return comparable !== undefined && sameItem(item, comparable);
    });
}

/**
 * Remove only the exact item snapshots that were already submitted. Items
 * added or edited while the request was in flight remain in the next
 * selection. A changed kit is preserved atomically.
 */
export function remainingItemsAfterSubmission(submitted: QuoteItem[], current: QuoteItem[]): QuoteItem[] {
  const submittedByKey = new Map(submitted.map((item) => [item.key, item]));
  const currentKeys = new Set(current.map((item) => item.key));
  const changedKitGroups = new Set<string>();

  for (const item of current) {
    const previous = submittedByKey.get(item.key);
    if ((!previous || !sameItem(previous, item)) && item.kitGroupId) changedKitGroups.add(item.kitGroupId);
  }
  for (const item of submitted) {
    if (item.kitGroupId && !currentKeys.has(item.key)) changedKitGroups.add(item.kitGroupId);
  }

  return current.filter((item) => {
    const previous = submittedByKey.get(item.key);
    return !previous || !sameItem(previous, item) || Boolean(item.kitGroupId && changedKitGroups.has(item.kitGroupId));
  });
}
