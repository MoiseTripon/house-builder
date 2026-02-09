let counter = 0;

export function generateId(prefix: string = "id"): string {
  counter++;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
