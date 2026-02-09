import { describe, it, expect } from "vitest";
import { offsetPolygon } from "@/domain/geometry/offset";
import { Vec2 } from "@/domain/geometry/vec2";

describe("Polygon Offset", () => {
  it("should offset a square outward", () => {
    const square: Vec2[] = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ];

    const result = offsetPolygon(square, 100);
    expect(result.length).toBe(4);

    // Each vertex should be further from center
    expect(result[0].x).toBeLessThan(0);
    expect(result[0].y).toBeLessThan(0);
    expect(result[2].x).toBeGreaterThan(1000);
    expect(result[2].y).toBeGreaterThan(1000);
  });

  it("should handle inward offset", () => {
    const square: Vec2[] = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ];

    const result = offsetPolygon(square, -100);
    expect(result.length).toBe(4);
    expect(result[0].x).toBeGreaterThan(0);
    expect(result[0].y).toBeGreaterThan(0);
  });
});
