"use client";

import React, { useState, useMemo } from "react";
import { useEditorStore } from "../model/editor.store";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { vec2 } from "@/domain/geometry/vec2";
import { cn } from "@/lib/utils";

/* ================================================================
   Shape definition types
   ================================================================ */

type ShapeType = "rectangle" | "l-shape" | "u-shape";

interface ShapeDef {
  type: ShapeType;
  label: string;
  description: string;
  points: [number, number][]; // normalised 0-1 for thumbnail
}

const SHAPES: ShapeDef[] = [
  {
    type: "rectangle",
    label: "Rectangle",
    description: "4-sided footprint",
    points: [
      [0.1, 0.15],
      [0.9, 0.15],
      [0.9, 0.85],
      [0.1, 0.85],
    ],
  },
  {
    type: "l-shape",
    label: "L-Shape",
    description: "L-shaped footprint",
    points: [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.9, 0.45],
      [0.5, 0.45],
      [0.5, 0.9],
      [0.1, 0.9],
    ],
  },
  {
    type: "u-shape",
    label: "U-Shape",
    description: "U-shaped footprint",
    points: [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.9, 0.9],
      [0.7, 0.9],
      [0.7, 0.4],
      [0.3, 0.4],
      [0.3, 0.9],
      [0.1, 0.9],
    ],
  },
];

/* ================================================================
   Shape thumbnail SVG
   ================================================================ */

function ShapeThumbnail({
  shape,
  selected,
  onClick,
}: {
  shape: ShapeDef;
  selected: boolean;
  onClick: () => void;
}) {
  const w = 80;
  const h = 80;

  const pathD = useMemo(() => {
    const pts = shape.points.map(([x, y]) => [x * w, y * h]);
    return (
      pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") +
      " Z"
    );
  }, [shape, w, h]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all cursor-pointer",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/50",
      )}
    >
      <svg width={w} height={h} className="flex-shrink-0">
        <path
          d={pathD}
          fill={
            selected
              ? "hsl(var(--primary) / 0.15)"
              : "hsl(var(--muted-foreground) / 0.08)"
          }
          stroke={
            selected
              ? "hsl(var(--primary))"
              : "hsl(var(--muted-foreground) / 0.5)"
          }
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[10px] font-medium leading-none">
        {shape.label}
      </span>
    </button>
  );
}

/* ================================================================
   Main toolbar
   ================================================================ */

export function DrawToolbar() {
  const executeCommand = useEditorStore((s) => s.executeCommand);
  const snapConfig = useEditorStore((s) => s.snapConfig);
  const setSnapConfig = useEditorStore((s) => s.setSnapConfig);

  const [shapesOpen, setShapesOpen] = useState(false);
  const [selectedShape, setSelectedShape] = useState<ShapeType | null>(null);

  // Rectangle dims
  const [rectW, setRectW] = useState(6000);
  const [rectH, setRectH] = useState(4000);

  // L-shape dims
  const [lW, setLW] = useState(8000);
  const [lH, setLH] = useState(6000);
  const [lCutW, setLCutW] = useState(4000);
  const [lCutH, setLCutH] = useState(3000);

  // U-shape dims
  const [uW, setUW] = useState(8000);
  const [uH, setUH] = useState(6000);
  const [uCutW, setUCutW] = useState(3000);
  const [uCutH, setUCutH] = useState(3000);

  const handleAdd = () => {
    switch (selectedShape) {
      case "rectangle":
        executeCommand({
          type: "CREATE_RECTANGLE",
          center: vec2(0, 0),
          width: rectW,
          height: rectH,
        });
        break;
      case "l-shape":
        executeCommand({
          type: "CREATE_L_SHAPE",
          center: vec2(0, 0),
          totalWidth: lW,
          totalHeight: lH,
          cutoutWidth: Math.min(lCutW, lW - 100),
          cutoutHeight: Math.min(lCutH, lH - 100),
        });
        break;
      case "u-shape":
        executeCommand({
          type: "CREATE_U_SHAPE",
          center: vec2(0, 0),
          totalWidth: uW,
          totalHeight: uH,
          cutoutWidth: Math.min(uCutW, uW - 200),
          cutoutHeight: Math.min(uCutH, uH - 100),
        });
        break;
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Accordion: Quick Shapes */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setShapesOpen(!shapesOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span>Quick Shapes</span>
          <span className="text-xs text-muted-foreground">
            {shapesOpen ? "▼" : "▶"}
          </span>
        </button>

        {shapesOpen && (
          <div className="px-3 pb-3 border-t border-border">
            {/* Shape thumbnails side by side */}
            <div className="flex gap-2 pt-3 justify-center">
              {SHAPES.map((shape) => (
                <ShapeThumbnail
                  key={shape.type}
                  shape={shape}
                  selected={selectedShape === shape.type}
                  onClick={() =>
                    setSelectedShape(
                      selectedShape === shape.type ? null : shape.type,
                    )
                  }
                />
              ))}
            </div>

            {/* Dimension inputs (shown when a shape is selected) */}
            {selectedShape && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Dimensions —{" "}
                  {SHAPES.find((s) => s.type === selectedShape)?.label}
                </div>

                {selectedShape === "rectangle" && (
                  <>
                    <NumberField
                      label="Width"
                      suffix="mm"
                      value={rectW}
                      onChange={setRectW}
                      min={100}
                      step={100}
                    />
                    <NumberField
                      label="Height"
                      suffix="mm"
                      value={rectH}
                      onChange={setRectH}
                      min={100}
                      step={100}
                    />
                    <div className="text-[10px] text-muted-foreground">
                      Area: {((rectW * rectH) / 1_000_000).toFixed(2)} m²
                    </div>
                  </>
                )}

                {selectedShape === "l-shape" && (
                  <>
                    <NumberField
                      label="Total W"
                      suffix="mm"
                      value={lW}
                      onChange={setLW}
                      min={200}
                      step={100}
                    />
                    <NumberField
                      label="Total H"
                      suffix="mm"
                      value={lH}
                      onChange={setLH}
                      min={200}
                      step={100}
                    />
                    <div className="border-t border-border my-1" />
                    <NumberField
                      label="Cut W"
                      suffix="mm"
                      value={lCutW}
                      onChange={(v) => setLCutW(Math.min(v, lW - 100))}
                      min={100}
                      max={lW - 100}
                      step={100}
                    />
                    <NumberField
                      label="Cut H"
                      suffix="mm"
                      value={lCutH}
                      onChange={(v) => setLCutH(Math.min(v, lH - 100))}
                      min={100}
                      max={lH - 100}
                      step={100}
                    />
                  </>
                )}

                {selectedShape === "u-shape" && (
                  <>
                    <NumberField
                      label="Total W"
                      suffix="mm"
                      value={uW}
                      onChange={setUW}
                      min={300}
                      step={100}
                    />
                    <NumberField
                      label="Total H"
                      suffix="mm"
                      value={uH}
                      onChange={setUH}
                      min={200}
                      step={100}
                    />
                    <div className="border-t border-border my-1" />
                    <NumberField
                      label="Cut W"
                      suffix="mm"
                      value={uCutW}
                      onChange={(v) => setUCutW(Math.min(v, uW - 200))}
                      min={100}
                      max={uW - 200}
                      step={100}
                    />
                    <NumberField
                      label="Cut H"
                      suffix="mm"
                      value={uCutH}
                      onChange={(v) => setUCutH(Math.min(v, uH - 100))}
                      min={100}
                      max={uH - 100}
                      step={100}
                    />
                  </>
                )}

                <button
                  onClick={handleAdd}
                  className="w-full mt-2 px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Add {SHAPES.find((s) => s.type === selectedShape)?.label}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
