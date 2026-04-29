import type {
  MenuByOutletItem,
  MenuItemAddOnMapping,
  MenuItemModifierMapping,
  MenuItemVariation,
} from '../types/types';

export function itemHasVariations(item: MenuByOutletItem): boolean {
  return Array.isArray((item as any).variations) && (item as any).variations.length > 0;
}

export function itemHasAddOns(item: MenuByOutletItem): boolean {
  return Array.isArray((item as any).addOnMappings) && (item as any).addOnMappings.length > 0;
}

export function itemHasModifiers(item: MenuByOutletItem): boolean {
  return Array.isArray((item as any).modifierMappings) && (item as any).modifierMappings.length > 0;
}

/** Item needs the options modal (variation and/or add-ons). */
export function itemNeedsOptionsModal(item: MenuByOutletItem): boolean {
  return (
    itemHasVariations(item) ||
    itemHasAddOns(item) ||
    itemHasModifiers(item)
  );
}

export function sortMappingIds(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

export function addOnSelectionEqual(a: number[], b: number[]): boolean {
  const sa = sortMappingIds(a);
  const sb = sortMappingIds(b);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

export function getDefaultVariation(
  item: MenuByOutletItem,
): MenuItemVariation | null {
  const list = (item as any).variations;
  if (!list?.length) return null;
  const def = list.find((v: any) => v.isDefault === true);
  return def ?? list[0] ?? null;
}

/** Unit price shown on the menu card (default variant when variations exist). */
export function getMenuDisplayUnitPrice(item: MenuByOutletItem): number {
  const v = getDefaultVariation(item);
  if (v != null) return Number(v.price) || 0;
  return Number(item.unitPrice) || 0;
}

export function getVariationById(
  item: MenuByOutletItem,
  variationId: number | null,
): MenuItemVariation | null {
  if (variationId == null || !(item as any).variations?.length) return null;
  return (item as any).variations.find((x: any) => x.id === variationId) ?? null;
}

/** Pre-tax unit from variation or base item only (no add-ons). */
export function getCartLineUnitBasePrice(
  item: MenuByOutletItem,
  variationId: number | null,
): number {
  const v = getVariationById(item, variationId);
  if (v != null) return Number(v.price) || 0;
  return Number(item.unitPrice) || 0;
}

export function getMappingById(
  item: MenuByOutletItem,
  mappingId: number,
): MenuItemAddOnMapping | null {
  return (item as any).addOnMappings?.find((m: any) => m.mappingId === mappingId) ?? null;
}

export function getModifierMappingById(
  item: MenuByOutletItem,
  mappingId: number,
): MenuItemModifierMapping | null {
  return (item as any).modifierMappings?.find((m: any) => m.mappingId === mappingId) ?? null;
}

/** Sum of pre-tax add-on prices for selected mapping ids (invalid ids ignored). */
export function getSelectedAddOnsPreTax(
  item: MenuByOutletItem,
  selectedMappingIds: number[],
): number {
  const list = (item as any).addOnMappings;
  if (!list?.length || !selectedMappingIds.length) return 0;
  const set = new Set(selectedMappingIds);
  let sum = 0;
  for (const m of list) {
    if (set.has(m.mappingId)) sum += Number(m.price) || 0;
  }
  return sum;
}

/** Sum of pre-tax modifier prices for selected mapping ids (invalid ids ignored). */
export function getSelectedModifiersPreTax(
  item: MenuByOutletItem,
  selectedMappingIds: number[],
): number {
  const list = (item as any).modifierMappings;
  if (!list?.length || !selectedMappingIds.length) return 0;
  const set = new Set(selectedMappingIds);
  let sum = 0;
  for (const m of list) {
    if (set.has(m.mappingId)) sum += Number(m.price) || 0;
  }
  return sum;
}

/** Full pre-tax unit: variation/base + selected add-ons + selected modifiers. */
export function getCartLineUnitPreTaxTotal(
  item: MenuByOutletItem,
  variationId: number | null,
  selectedAddOnMappingIds: number[],
  selectedModifierMappingIds: number[] = [],
): number {
  return (
    getCartLineUnitBasePrice(item, variationId) +
    getSelectedAddOnsPreTax(item, selectedAddOnMappingIds) +
    getSelectedModifiersPreTax(item, selectedModifierMappingIds)
  );
}

export function formatReceiptLineName(
  item: MenuByOutletItem,
  variationId: number | null,
  selectedAddOnMappingIds: number[],
  selectedModifierMappingIds: number[] = [],
): string {
  const base = (item.name ?? 'Item').trim();
  const v = getVariationById(item, variationId);
  const vn =
    v &&
    ((v.variationName ?? '').trim() || (v.variationType ?? '').trim());
  let title = base;
  if (vn) title = `${base} (${vn})`;

  const addons = sortMappingIds(selectedAddOnMappingIds)
    .map((id) => getMappingById(item, id))
    .filter((m): m is MenuItemAddOnMapping => m != null)
    .map((m) => (m.addOnName ?? '').trim() || `Add-on ${m.addOnId}`)
    .filter(Boolean);

  const mods = sortMappingIds(selectedModifierMappingIds)
    .map((id) => getModifierMappingById(item, id))
    .filter((m): m is MenuItemModifierMapping => m != null)
    .map((m) => (m.modifierName ?? '').trim() || `Modifier ${m.modifierId}`)
    .filter(Boolean);

  const extra = [...addons, ...mods];
  if (extra.length === 0) return title;
  return `${title} · ${extra.join(', ')}`;
}

export function variationLabel(v: MenuItemVariation): string {
  const name = (v.variationName ?? '').trim();
  const type = (v.variationType ?? '').trim();
  if (name && type) return `${type}: ${name}`;
  return name || type || 'Option';
}

export function addOnLabel(m: MenuItemAddOnMapping): string {
  const n = (m.addOnName ?? '').trim();
  return n || `Add-on #${m.addOnId}`;
}

export function modifierLabel(m: MenuItemModifierMapping): string {
  const n = (m.modifierName ?? '').trim();
  return n || `Modifier #${m.modifierId}`;
}
