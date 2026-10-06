import type { QuoteItem } from '../types';

function sameItem(left: QuoteItem, right: QuoteItem): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Remove only the exact item snapshots that were already submitted. Items
 * added or edited while the request was in flight remain in the next
 * selection. A changed kit is preserved atomically.
 */
export function remainingItemsAfterSubmission(submitted: QuoteItem[], current: QuoteItem[]): QuoteItem[] {
  const submittedByKey = new Map(submitted.map((item) => [item.key, item]));
  const currentByKey = new Map(current.map((item) => [item.key, item]));
  const changedKitGroups = new Set<string>();

  for (const item of current) {
    const previous = submittedByKey.get(item.key);
    if ((!previous || !sameItem(previous, item)) && item.kitGroupId) changedKitGroups.add(item.kitGroupId);
  }
  for (const item of submitted) {
    if (item.kitGroupId && !currentByKey.has(item.key)) changedKitGroups.add(item.kitGroupId);
  }

  return current.filter((item) => {
    const previous = submittedByKey.get(item.key);
    return !previous || !sameItem(previous, item) || Boolean(item.kitGroupId && changedKitGroups.has(item.kitGroupId));
  });
}
