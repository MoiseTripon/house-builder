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
        {/* Left toolbar */}
        <div className="w-64 border-r border-border overflow-y-auto bg-muted/30">
          <DrawToolbar />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <BuilderCanvas />

          {/* Mode indicator overlay */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-xs font-medium border border-border">
            {mode === "select" &&
              "🔲 Select Mode — Click to select, drag to move"}
            {mode === "draw" &&
              "✏️ Draw Mode — Click to place points, close to form area"}
            {mode === "split" && "✂️ Split Mode — Click on an edge to split it"}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l border-border overflow-y-auto bg-muted/30">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
