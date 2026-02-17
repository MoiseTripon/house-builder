import { useEffect } from "react";
import { useWallsStore } from "@/features/walls/model/walls.store";
import { useRoofStore } from "@/features/roof/model/roof.store";

/**
 * Ensures that wall selection and roof plane selection are mutually exclusive
 * when not multi-selecting (shift-click).
 *
 * Subscribe to each store; when one gets a selection, clear the other.
 */
export function useUnifiedSelection() {
  useEffect(() => {
    // When a wall is selected, clear roof plane selection
    const unsubWalls = useWallsStore.subscribe(
      (s) => s.selection.wallIds,
      (wallIds) => {
        if (wallIds.length > 0) {
          const roofSel = useRoofStore.getState().planeSelection;
          if (roofSel.planeIds.length > 0) {
            useRoofStore.getState().clearPlaneSelection();
          }
        }
      },
    );

    // When a roof plane is selected, clear wall selection
    const unsubRoof = useRoofStore.subscribe(
      (s) => s.planeSelection.planeIds,
      (planeIds) => {
        if (planeIds.length > 0) {
          const wallSel = useWallsStore.getState().selection;
          if (wallSel.wallIds.length > 0) {
            useWallsStore.getState().clearWallSelection();
          }
        }
      },
    );

    return () => {
      unsubWalls();
      unsubRoof();
    };
  }, []);
}
