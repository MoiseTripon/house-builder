import {
  Vec2,
  sub,
  add,
  normalize,
  perpCW,
  scale,
  length,
} from "../geometry/vec2";

/**
 * Represents a single wall's 3D geometry data
 */
export interface WallSolid {
  wallId: string;
  edgeId: string;

  // The four bottom corners (in world XY plane at z=0)
  // Ordered: startLeft, startRight, endRight, endLeft
  baseQuad: [Vec2, Vec2, Vec2, Vec2];

  // Heights
  height: number;
  baseZ: number;

  // For rendering
  vertices: Float32Array; // 24 vertices (8 corners × 3 components)
  indices: Uint16Array; // 36 indices (12 triangles × 3)
  normals: Float32Array;
}

/**
 * Generates wall solid geometry from an edge with butted joints.
 *
 * Butted joints: The wall extends from the centerline of the edge,
 * offset by half the thickness on each side. No mitering at corners.
 */
export function generateWallSolid(
  wallId: string,
  edgeId: string,
  start: Vec2,
  end: Vec2,
  thickness: number,
  height: number,
  baseZ: number = 0,
): WallSolid {
  const halfThick = thickness / 2;

  // Direction along the wall
  const dir = sub(end, start);
  const len = length(dir);

  if (len < 1) {
    // Degenerate edge - return minimal geometry
    return createDegenerateWallSolid(wallId, edgeId, start, height, baseZ);
  }

  const dirNorm = normalize(dir);

  // Perpendicular direction (to the right when looking from start to end)
  const perp = perpCW(dirNorm);

  // Calculate the four base corners
  // We offset perpendicular to the edge direction
  const startLeft = add(start, scale(perp, -halfThick));
  const startRight = add(start, scale(perp, halfThick));
  const endRight = add(end, scale(perp, halfThick));
  const endLeft = add(end, scale(perp, -halfThick));

  const baseQuad: [Vec2, Vec2, Vec2, Vec2] = [
    startLeft,
    startRight,
    endRight,
    endLeft,
  ];

  // Generate 3D geometry
  const { vertices, indices, normals } = generateBoxGeometry(
    baseQuad,
    baseZ,
    height,
  );

  return {
    wallId,
    edgeId,
    baseQuad,
    height,
    baseZ,
    vertices,
    indices,
    normals,
  };
}

/**
 * Generates box geometry from a base quad and height
 */
function generateBoxGeometry(
  baseQuad: [Vec2, Vec2, Vec2, Vec2],
  baseZ: number,
  height: number,
): {
  vertices: Float32Array;
  indices: Uint16Array;
  normals: Float32Array;
} {
  const [bl, br, tr, tl] = baseQuad; // bottom-left, bottom-right, top-right, top-left (in 2D)
  const topZ = baseZ + height;

  // 8 corners of the box
  // Bottom face (z = baseZ)
  // 0: bl, 1: br, 2: tr, 3: tl
  // Top face (z = topZ)
  // 4: bl, 5: br, 6: tr, 7: tl

  const corners = [
    // Bottom
    [bl.x, bl.y, baseZ],
    [br.x, br.y, baseZ],
    [tr.x, tr.y, baseZ],
    [tl.x, tl.y, baseZ],
    // Top
    [bl.x, bl.y, topZ],
    [br.x, br.y, topZ],
    [tr.x, tr.y, topZ],
    [tl.x, tl.y, topZ],
  ];

  // For proper lighting, we need separate vertices for each face
  // 6 faces × 4 vertices = 24 vertices
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Helper to add a quad face
  const addFace = (
    c0: number[],
    c1: number[],
    c2: number[],
    c3: number[],
    nx: number,
    ny: number,
    nz: number,
  ) => {
    const baseIdx = vertices.length / 3;

    vertices.push(...c0, ...c1, ...c2, ...c3);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);

    // Two triangles
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
  };

  // Calculate face normals
  const dirX = tr.x - tl.x;
  const dirY = tr.y - tl.y;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
  const frontNx = -dirY / dirLen;
  const frontNy = dirX / dirLen;

  // Front face (tl -> tr -> top) - facing outward from the "front" of the wall
  addFace(corners[3], corners[2], corners[6], corners[7], frontNx, frontNy, 0);

  // Back face (br -> bl -> top)
  addFace(
    corners[1],
    corners[0],
    corners[4],
    corners[5],
    -frontNx,
    -frontNy,
    0,
  );

  // Left face (bl -> tl -> top)
  const leftDirX = tl.x - bl.x;
  const leftDirY = tl.y - bl.y;
  const leftLen = Math.sqrt(leftDirX * leftDirX + leftDirY * leftDirY) || 1;
  addFace(
    corners[0],
    corners[3],
    corners[7],
    corners[4],
    -leftDirY / leftLen,
    leftDirX / leftLen,
    0,
  );

  // Right face (tr -> br -> top)
  addFace(
    corners[2],
    corners[1],
    corners[5],
    corners[6],
    leftDirY / leftLen,
    -leftDirX / leftLen,
    0,
  );

  // Top face (z = topZ)
  addFace(corners[4], corners[5], corners[6], corners[7], 0, 0, 1);

  // Bottom face (z = baseZ)
  addFace(corners[3], corners[2], corners[1], corners[0], 0, 0, -1);

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    normals: new Float32Array(normals),
  };
}

function createDegenerateWallSolid(
  wallId: string,
  edgeId: string,
  position: Vec2,
  height: number,
  baseZ: number,
): WallSolid {
  // Create a tiny box at the position
  const size = 1;
  const baseQuad: [Vec2, Vec2, Vec2, Vec2] = [
    { x: position.x - size, y: position.y - size },
    { x: position.x + size, y: position.y - size },
    { x: position.x + size, y: position.y + size },
    { x: position.x - size, y: position.y + size },
  ];

  const { vertices, indices, normals } = generateBoxGeometry(
    baseQuad,
    baseZ,
    height,
  );

  return {
    wallId,
    edgeId,
    baseQuad,
    height,
    baseZ,
    vertices,
    indices,
    normals,
  };
}

/**
 * Regenerate wall solid with new height
 */
export function updateWallSolidHeight(
  solid: WallSolid,
  newHeight: number,
): WallSolid {
  const { vertices, indices, normals } = generateBoxGeometry(
    solid.baseQuad,
    solid.baseZ,
    newHeight,
  );

  return {
    ...solid,
    height: newHeight,
    vertices,
    indices,
    normals,
  };
}
