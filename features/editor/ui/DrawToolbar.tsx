"use client";

import React, { useState } from "react";
import { useEditorStore } from "../model/editor.store";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { vec2 } from "@/domain/geometry/vec2";

type ShapeType = "rectangle" | "l-shape";

const SHAPE_OPTIONS: { value: ShapeType; label: string }[] = [
  { value: "rectangle", label: "Rectangle" },
  { value: "l-shape", label: "L-Shape" },
];

export function DrawToolbar() {
  const executeCommand = useEditorStore((s) => s.executeCommand);
  const snapConfig = useEditorStore((s) => s.snapConfig);
  const setSnapConfig = useEditorStore((s) => s.setSnapConfig);

  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");

  // Rectangle
  const [rectWidth, setRectWidth] = useState(6000);
  const [rectHeight, setRectHeight] = useState(4000);

  // L-shape
  const [lTotalW, setLTotalW] = useState(8000);
  const [lTotalH, setLTotalH] = useState(6000);
  const [lCutW, setLCutW] = useState(4000);
  const [lCutH, setLCutH] = useState(3000);

  const handleAddShape = () => {
    switch (shapeType) {
      case "rectangle":
        executeCommand({
          type: "CREATE_RECTANGLE",
          center: vec2(0, 0),
          width: rectWidth,
          height: rectHeight,
        });
        break;
      case "l-shape":
        executeCommand({
          type: "CREATE_L_SHAPE",
          center: vec2(0, 0),
          totalWidth: lTotalW,
          totalHeight: lTotalH,
          cutoutWidth: Math.min(lCutW, lTotalW - 100),
          cutoutHeight: Math.min(lCutH, lTotalH - 100),
        });
        break;
    }
  };

  return (
    <div className="p-4 space-y-3">
      <Panel title="Quick Shapes">
        <div className="space-y-4">
          {/* Shape type dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Shape
            </label>
            <select
              value={shapeType}
              onChange={(e) => setShapeType(e.target.value as ShapeType)}
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {SHAPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dimension inputs based on shape */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Dimensions
            </div>

            {shapeType === "rectangle" && (
              <>
                <NumberField
                  label="Width"
                  suffix="mm"
                  value={rectWidth}
                  onChange={setRectWidth}
                  min={100}
                  step={100}
                />
                <NumberField
                  label="Height"
                  suffix="mm"
                  value={rectHeight}
                  onChange={setRectHeight}
                  min={100}
                  step={100}
                />
                {/* Preview info */}
                <div className="text-[10px] text-muted-foreground pt-1">
                  Area: {((rectWidth * rectHeight) / 1_000_000).toFixed(2)} m²
                </div>
              </>
            )}

            {shapeType === "l-shape" && (
              <>
                <NumberField
                  label="Total W"
                  suffix="mm"
                  value={lTotalW}
                  onChange={setLTotalW}
                  min={200}
                  step={100}
                />
                <NumberField
                  label="Total H"
                  suffix="mm"
                  value={lTotalH}
                  onChange={setLTotalH}
                  min={200}
                  step={100}
                />
                <div className="border-t border-border my-1" />
                <NumberField
                  label="Cut W"
                  suffix="mm"
                  value={lCutW}
                  onChange={(v) => setLCutW(Math.min(v, lTotalW - 100))}
                  min={100}
                  max={lTotalW - 100}
                  step={100}
                />
                <NumberField
                  label="Cut H"
                  suffix="mm"
                  value={lCutH}
                  onChange={(v) => setLCutH(Math.min(v, lTotalH - 100))}
                  min={100}
                  max={lTotalH - 100}
                  step={100}
                />
                <div className="text-[10px] text-muted-foreground pt-1">
                  Area:{" "}
                  {(
                    (lTotalW * lTotalH -
                      Math.min(lCutW, lTotalW - 100) *
                        Math.min(lCutH, lTotalH - 100)) /
                    1_000_000
                  ).toFixed(2)}{" "}
                  m²
                </div>
              </>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={handleAddShape}
            className="w-full px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Add {SHAPE_OPTIONS.find((o) => o.value === shapeType)?.label} to
            Plan
          </button>
        </div>
      </Panel>

      {/* Snap settings */}
      <Panel title="Snap Settings" collapsible>
        <div className="space-y-2">
          <NumberField
            label="Grid Size"
            suffix="mm"
            value={snapConfig.gridSize}
            min={10}
            step={10}
            onChange={(v) => setSnapConfig({ gridSize: v })}
          />
          <NumberField
            label="Angle Step"
            suffix="°"
            value={snapConfig.angleStep}
            min={1}
            max={90}
            step={5}
            onChange={(v) => setSnapConfig({ angleStep: v })}
          />
          <NumberField
            label="Snap Radius"
            suffix="px"
            value={snapConfig.snapRadius}
            min={4}
            max={40}
            step={2}
            onChange={(v) => setSnapConfig({ snapRadius: v })}
          />
        </div>
      </Panel>
    </div>
  );
}
