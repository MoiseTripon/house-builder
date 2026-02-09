"use client";

import React, { useState } from "react";
import { useEditorStore } from "../model/editor.store";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { vec2 } from "@/domain/geometry/vec2";

export function DrawToolbar() {
  const { mode, plan, executeCommand, setMode } = useEditorStore();
  const [rectWidth, setRectWidth] = useState(6000);
  const [rectHeight, setRectHeight] = useState(4000);
  const [lTotalW, setLTotalW] = useState(8000);
  const [lTotalH, setLTotalH] = useState(6000);
  const [lCutW, setLCutW] = useState(4000);
  const [lCutH, setLCutH] = useState(3000);

  return (
    <div className="p-4 space-y-3">
      <Panel title="Quick Shapes">
        <div className="space-y-3">
          {/* Rectangle */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Rectangle</div>
            <NumberField
              label="W"
              suffix="mm"
              value={rectWidth}
              onChange={setRectWidth}
              min={100}
              step={100}
            />
            <NumberField
              label="H"
              suffix="mm"
              value={rectHeight}
              onChange={setRectHeight}
              min={100}
              step={100}
            />
            <button
              onClick={() => {
                executeCommand({
                  type: "CREATE_RECTANGLE",
                  center: vec2(0, 0),
                  width: rectWidth,
                  height: rectHeight,
                });
              }}
              className="w-full px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Add Rectangle
            </button>
          </div>

          <div className="border-t border-border" />

          {/* L-Shape */}
          <div className="space-y-2">
            <div className="text-xs font-medium">L-Shape</div>
            <NumberField
              label="Total W"
              suffix="mm"
              value={lTotalW}
              onChange={setLTotalW}
              min={100}
              step={100}
            />
            <NumberField
              label="Total H"
              suffix="mm"
              value={lTotalH}
              onChange={setLTotalH}
              min={100}
              step={100}
            />
            <NumberField
              label="Cutout W"
              suffix="mm"
              value={lCutW}
              onChange={setLCutW}
              min={100}
              step={100}
            />
            <NumberField
              label="Cutout H"
              suffix="mm"
              value={lCutH}
              onChange={setLCutH}
              min={100}
              step={100}
            />
            <button
              onClick={() => {
                executeCommand({
                  type: "CREATE_L_SHAPE",
                  center: vec2(0, 0),
                  totalWidth: lTotalW,
                  totalHeight: lTotalH,
                  cutoutWidth: lCutW,
                  cutoutHeight: lCutH,
                });
              }}
              className="w-full px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Add L-Shape
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Drawing" collapsible>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {mode === "draw"
              ? "Click to place points. Click the first point or press Enter to close the shape."
              : "Switch to Draw mode (D) to create custom shapes."}
          </p>
          {mode !== "draw" && (
            <button
              onClick={() => setMode("draw")}
              className="w-full px-3 py-1.5 text-xs border border-border rounded hover:bg-muted transition-colors"
            >
              Start Drawing
            </button>
          )}
          {mode === "draw" && (
            <button
              onClick={() => setMode("select")}
              className="w-full px-3 py-1.5 text-xs border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors"
            >
              Cancel Drawing
            </button>
          )}
        </div>
      </Panel>

      <Panel title="Snap Settings" collapsible>
        <div className="space-y-2">
          <NumberField
            label="Grid Size"
            suffix="mm"
            value={useEditorStore.getState().snapConfig.gridSize}
            min={10}
            step={10}
            onChange={(v) =>
              useEditorStore.getState().setSnapConfig({ gridSize: v })
            }
          />
          <NumberField
            label="Angle Step"
            suffix="°"
            value={useEditorStore.getState().snapConfig.angleStep}
            min={1}
            max={90}
            step={5}
            onChange={(v) =>
              useEditorStore.getState().setSnapConfig({ angleStep: v })
            }
          />
        </div>
      </Panel>
    </div>
  );
}
