export type UnitSystem = "metric" | "imperial";

export interface UnitConfig {
  system: UnitSystem;
  precision: number;
}

const DEFAULT_CONFIG: UnitConfig = { system: "metric", precision: 1 };

// Internal unit is always millimeters
export function mmToM(mm: number): number {
  return mm / 1000;
}

export function mToMm(m: number): number {
  return m * 1000;
}

export function mmToFeet(mm: number): number {
  return mm / 304.8;
}

export function feetToMm(feet: number): number {
  return feet * 304.8;
}

export function mmToInches(mm: number): number {
  return mm / 25.4;
}

export function inchesToMm(inches: number): number {
  return inches * 25.4;
}

export function formatLength(
  mm: number,
  config: UnitConfig = DEFAULT_CONFIG,
): string {
  if (config.system === "imperial") {
    const totalInches = mmToInches(mm);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    if (feet === 0) return `${inches.toFixed(config.precision)}"`;
    if (Math.abs(inches) < 0.01) return `${feet}'`;
    return `${feet}' ${inches.toFixed(config.precision)}"`;
  }
  const m = mmToM(mm);
  if (m >= 1) return `${m.toFixed(config.precision)} m`;
  return `${mm.toFixed(0)} mm`;
}

export function roundToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}
