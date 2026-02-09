"use client";

import React from "react";
import { TopBar } from "./TopBar";
import { PropertiesPanel } from "./PropertiesPanel";
import { DrawToolbar } from "./DrawToolbar";
import { BuilderCanvas } from "@/scene/BuilderCanvas";
import { useEditorStore } from "../model/editor.store";

export function EditorShell() {
  const mode = useEditorStore((s) => s.mode);

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar — shapes + snap */}
        <div className="w-64 border-r border-border overflow-y-auto bg-muted/30 flex-shrink-0">
          <DrawToolbar />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative min-w-0">
          <BuilderCanvas />

          {/* Mode indicator overlay */}
          <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-background/80 backdrop-blur-sm rounded-md text-xs font-medium border border-border pointer-events-none select-none">
            {mode === "select" &&
              "🔲  Select — Click to select, drag vertices to move"}
            {mode === "draw" &&
              "✏️  Draw — Click to place points, connect to close"}
            {mode === "split" && "✂️  Split — Click on an edge to split it"}
          </div>
        </div>

        {/* Right panel — properties */}
        <div className="w-72 border-l border-border overflow-y-auto bg-muted/30 flex-shrink-0">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
