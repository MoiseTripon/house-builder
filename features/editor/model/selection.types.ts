export type SelectionType = "vertex" | "edge" | "face";

export interface SelectionItem {
  type: SelectionType;
  id: string;
}

export interface Selection {
  items: SelectionItem[];
  primary: SelectionItem | null; // last selected = primary
}

export function emptySelection(): Selection {
  return { items: [], primary: null };
}

export function singleSelection(type: SelectionType, id: string): Selection {
  const item = { type, id };
  return { items: [item], primary: item };
}

export function addToSelection(
  selection: Selection,
  type: SelectionType,
  id: string,
): Selection {
  const existing = selection.items.find((i) => i.type === type && i.id === id);
  if (existing) return selection;
  const item = { type, id };
  return {
    items: [...selection.items, item],
    primary: item,
  };
}

export function removeFromSelection(
  selection: Selection,
  type: SelectionType,
  id: string,
): Selection {
  const items = selection.items.filter(
    (i) => !(i.type === type && i.id === id),
  );
  return {
    items,
    primary: items.length > 0 ? items[items.length - 1] : null,
  };
}

export function toggleInSelection(
  selection: Selection,
  type: SelectionType,
  id: string,
): Selection {
  const existing = selection.items.find((i) => i.type === type && i.id === id);
  if (existing) return removeFromSelection(selection, type, id);
  return addToSelection(selection, type, id);
}

export function isSelected(
  selection: Selection,
  type: SelectionType,
  id: string,
): boolean {
  return selection.items.some((i) => i.type === type && i.id === id);
}

export function getSelectedIds(
  selection: Selection,
  type: SelectionType,
): string[] {
  return selection.items.filter((i) => i.type === type).map((i) => i.id);
}
