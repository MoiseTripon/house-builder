"use client";

import React, { useState, useMemo } from "react";
import { useEditorStore } from "../model/editor.store";
import { Panel } from "@/shared/ui/Panel";
import { NumberField } from "@/shared/ui/NumberField";
import { vec2 } from "@/domain/geometry/vec2";
import { cn } from "@/lib/utils";
import { WallsPanel } from "@/features/walls/ui/WallsPanel";
import { RoofPanel } from "@/features/roof";

type ShapeType = "rectangle" | "l-shape" | "u-shape";

interface ShapeDef {
  type: ShapeType;
  label: string;
  points: [number, number][];
}

const SHAPES: ShapeDef[] = [
  {
    type: "rectangle",
    label: "Rect",
    points: [
      [0.15, 0.15],
      [0.85, 0.15],
      [0.85, 0.85],
      [0.15, 0.85],
    ],
  },
  {
    type: "l-shape",
    label: "L",
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
    label: "U",
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

function ShapeThumbnail({
  shape,
  selected,
  onClick,
}: {
  shape: ShapeDef;
  selected: boolean;
  onClick: () => void;
}) {
  const s = 48;
  const pathD = useMemo(() => {
    const pts = shape.points.map(([x, y]) => [x * s, y * s]);
    return (
      pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") +
      " Z"
    );
  }, [shape, s]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-1.5 rounded-md border transition-all cursor-pointer",
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/50",
      )}
    >
      <svg width={s} height={s} className="flex-shrink-0">
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
      <span className="text-[9px] font-medium leading-none">{shape.label}</span>
    </button>
  );
}

export function DrawToolbar() {
  const executeCommand = useEditorStore((s) => s.executeCommand);
  const snapConfig = useEditorStore((s) => s.snapConfig);
  const setSnapConfig = useEditorStore((s) => s.setSnapConfig);
  const viewMode = useEditorStore((s) => s.viewMode);

  const [shapesOpen, setShapesOpen] = useState(false);
  const [selectedShape, setSelectedShape] = useState<ShapeType | null>(null);

  const [rectW, setRectW] = useState(6000);
  const [rectH, setRectH] = useState(4000);
  const [lW, setLW] = useState(8000);
  const [lH, setLH] = useState(6000);
  const [lCutW, setLCutW] = useState(4000);
  const [lCutH, setLCutH] = useState(3000);
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

  const isPlanView = viewMode === "plan";

  return (
    <div className="p-3 space-y-3">
      {/* Quick Shapes - only in plan view */}
      {isPlanView && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShapesOpen(!shapesOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
          >
            <span>Quick Shapes</span>
            <span className="text-[10px] text-muted-foreground">
              {shapesOpen ? "▼" : "▶"}
            </span>
          </button>

          {shapesOpen && (
            <div className="border-t border-border max-h-[320px] overflow-y-auto">
              <div className="px-2 pt-2 pb-1">
                <div className="flex gap-1.5 justify-center flex-wrap">
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

                {selectedShape && (
                  <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                    <div className="text-[10px] font-medium text-muted-foreground">
                      {SHAPES.find((s) => s.type === selectedShape)?.label}{" "}
                      Dimensions
                    </div>

                    {selectedShape === "rectangle" && (
                      <>
                        <NumberField
                          label="W"
                          suffix="mm"
                          value={rectW}
                          onChange={setRectW}
                          min={100}
                          step={100}
                        />
                        <NumberField
                          label="H"
                          suffix="mm"
                          value={rectH}
                          onChange={setRectH}
                          min={100}
                          step={100}
                        />
                      </>
                    )}

                    {selectedShape === "l-shape" && (
                      <>
                        <NumberField
                          label="W"
                          suffix="mm"
                          value={lW}
                          onChange={setLW}
                          min={200}
                          step={100}
                        />
                        <NumberField
                          label="H"
                          suffix="mm"
                          value={lH}
                          onChange={setLH}
                          min={200}
                          step={100}
                        />
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
                          label="W"
                          suffix="mm"
                          value={uW}
                          onChange={setUW}
                          min={300}
                          step={100}
                        />
                        <NumberField
                          label="H"
                          suffix="mm"
                          value={uH}
                          onChange={setUH}
                          min={200}
                          step={100}
                        />
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
                      className="w-full mt-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Snap settings - only in plan view */}
      {isPlanView && (
        <Panel title="Snap Settings" collapsible>
          <div className="space-y-2">
            <NumberField
              label="Grid"
              suffix="mm"
              value={snapConfig.gridSize}
              min={10}
              step={10}
              onChange={(v) => setSnapConfig({ gridSize: v })}
            />
            <NumberField
              label="Angle"
              suffix="°"
              value={snapConfig.angleStep}
              min={1}
              max={90}
              step={5}
              onChange={(v) => setSnapConfig({ angleStep: v })}
            />
            <NumberField
              label="Radius"
              suffix="px"
              value={snapConfig.snapRadius}
              min={4}
              max={40}
              step={2}
              onChange={(v) => setSnapConfig({ snapRadius: v })}
            />
          </div>
        </Panel>
      )}

      {/* Walls Panel */}
      <WallsPanel />
      <RoofPanel />
    </div>
  );
}
