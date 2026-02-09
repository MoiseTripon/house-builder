import {
  Vec2,
  vec2,
  sub,
  add,
  normalize,
  perpCCW,
  scale,
  distance,
} from "./vec2";
import { lineIntersection } from "./intersect";

export function offsetPolygon(vertices: Vec2[], dist: number): Vec2[] {
  const n = vertices.length;
  if (n < 3) return vertices;

  const offsetLines: { point: Vec2; dir: Vec2 }[] = [];

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dir = normalize(sub(vertices[j], vertices[i]));
    const normal = perpCCW(dir);
    const point = add(vertices[i], scale(normal, dist));
    offsetLines.push({ point, dir });
  }

  const result: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = (i - 1 + n) % n;
    const intersection = lineIntersection(
      offsetLines[prev].point,
      offsetLines[prev].dir,
      offsetLines[i].point,
      offsetLines[i].dir,
    );
    if (intersection.intersects && intersection.point) {
      result.push(intersection.point);
    } else {
      result.push(
        add(
          vertices[i],
          scale(
            perpCCW(normalize(sub(vertices[(i + 1) % n], vertices[i]))),
            dist,
          ),
        ),
      );
    }
  }

  return result;
}
