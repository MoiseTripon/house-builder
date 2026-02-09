import { Camera, Vector3 } from "three";

export function screenToPlan(
  screenX: number,
  screenY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  // Convert screen coords to NDC
  const ndcX = (screenX / canvasWidth) * 2 - 1;
  const ndcY = -(screenY / canvasHeight) * 2 + 1;

  // Unproject with the orthographic camera
  const worldPos = new Vector3(ndcX, ndcY, 0).unproject(camera);

  return { x: worldPos.x, y: worldPos.y };
}
