export type Maybe<T> = T | null | undefined;

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsCenter(b: Bounds): { x: number; y: number } {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function boundsSize(b: Bounds): { width: number; height: number } {
  return { width: b.maxX - b.minX, height: b.maxY - b.minY };
}
