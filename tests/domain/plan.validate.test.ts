import { describe, it, expect } from "vitest";
import { createEmptyPlan } from "@/domain/plan/types";
import {
  addVertex,
  addEdge,
  moveVertex,
  createRectangle,
} from "@/domain/plan/mutations";
import {
  validatePlan,
  isPlanValid,
  canDeleteVertex,
} from "@/domain/plan/validate";

describe("Plan Validation", () => {
  it("should validate empty plan", () => {
    const plan = createEmptyPlan();
    expect(isPlanValid(plan)).toBe(true);
  });

  it("should detect orphan vertices", () => {
    let plan = createEmptyPlan();
    const { plan: p1 } = addVertex(plan, { x: 0, y: 0 });
    const errors = validatePlan(p1);
    expect(errors.some((e) => e.type === "orphan_vertex")).toBe(true);
  });

  it("should validate rectangle", () => {
    let plan = createEmptyPlan();
    const result = createRectangle(plan, { x: 0, y: 0 }, 4000, 3000);
    const errors = validatePlan(result.plan);
    const significantErrors = errors.filter((e) => e.type !== "orphan_vertex");
    expect(significantErrors.length).toBe(0);
  });

  it("should allow deleting vertex from 5-vertex face", () => {
    // Create a pentagon-ish shape
    let plan = createEmptyPlan();
    const { plan: p1, vertexId: v1 } = addVertex(plan, { x: 0, y: 0 });
    const { plan: p2, vertexId: v2 } = addVertex(p1, { x: 1000, y: 0 });
    const { plan: p3, vertexId: v3 } = addVertex(p2, { x: 1500, y: 1000 });
    const { plan: p4, vertexId: v4 } = addVertex(p3, { x: 500, y: 1500 });
    const { plan: p5, vertexId: v5 } = addVertex(p4, { x: -500, y: 1000 });

    let current = p5;
    current = addEdge(current, v1, v2).plan;
    current = addEdge(current, v2, v3).plan;
    current = addEdge(current, v3, v4).plan;
    current = addEdge(current, v4, v5).plan;
    current = addEdge(current, v5, v1).plan;

    const result = canDeleteVertex(current, v3);
    expect(result.allowed).toBe(true);
  });
});
