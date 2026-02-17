"use client";

import React from "react";
import { useRoofStore, RoofTool } from "../model/roof.store";
import { RoofEdgeRole } from "@/domain/structure/roofTopology/types";
import { cn } from "@/lib/utils";

const TOOLS: { tool: RoofTool; label: string; icon: string }[] = [
  { tool: "select", label: "Select", icon: "⊹" },
  { tool: "add-ridge", label: "Ridge", icon: "△" },
  { tool: "add-hip", label: "Hip", icon: "⌒" },
  { tool: "add-valley", label: "Valley", icon: "⌄" },
  { tool: "mark-gable", label: "Gable", icon: "▯" },
  { tool: "add-vertex", label: "Vertex", icon: "·" },
  { tool: "pin-height", label: "Pin Z", icon: "📌" },
];

const EDGE_ROLES: { role: RoofEdgeRole; label: string; color: string }[] = [
  { role: "eave", label: "Eave", color: "#94a3b8" },
  { role: "ridge", label: "Ridge", color: "#ef4444" },
  { role: "hip", label: "Hip", color: "#f97316" },
  { role: "valley", label: "Valley", color: "#3b82f6" },
  { role: "gable", label: "Gable", color: "#a855f7" },
  { role: "rake", label: "Rake", color: "#22c55e" },
];

export function RoofToolbar() {
  const roofTool = useRoofStore((s) => s.roofTool);
  const setRoofTool = useRoofStore((s) => s.setRoofTool);
  const edgeSelection = useRoofStore((s) => s.edgeSelection);
  const roofs = useRoofStore((s) => s.roofs);

  // Find the roof and edge for the current selection
  const selectedEdge = React.useMemo(() => {
    if (!edgeSelection.primary) return null;
    for (const roof of Object.values(roofs)) {
      if (!roof.useCustomTopology) continue;
      const edge = roof.topology.edges[edgeSelection.primary];
      if (edge) return { roof, edge };
    }
    return null;
  }, [edgeSelection.primary, roofs]);

  const hasCustomRoofs = Object.values(roofs).some((r) => r.useCustomTopology);
  if (!hasCustomRoofs) return null;

  return (
    <div className="space-y-2">
      {/* Tool buttons */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Roof Edit</label>
        <div className="flex flex-wrap gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              onClick={() => setRoofTool(t.tool)}
              className={cn(
                "text-[10px] px-1.5 py-1 rounded border transition-colors flex items-center gap-1",
                roofTool === t.tool
                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                  : "border-border hover:bg-muted",
              )}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Edge role changer */}
      {selectedEdge && (
        <div className="space-y-1.5 border-t border-border pt-2">
          <label className="text-xs text-muted-foreground">
            Edge Role:{" "}
            <span className="text-foreground">{selectedEdge.edge.role}</span>
          </label>
          <div className="flex flex-wrap gap-1">
            {EDGE_ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() =>
                  useRoofStore
                    .getState()
                    .topoSetEdgeRole(
                      selectedEdge.roof.id,
                      selectedEdge.edge.id,
                      r.role,
                    )
                }
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 transition-colors",
                  selectedEdge.edge.role === r.role
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-border hover:bg-muted",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: r.color }}
                />
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
