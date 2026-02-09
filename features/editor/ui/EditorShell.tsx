"use client";

import React from "react";
import { TopBar } from "./TopBar";
import { PropertiesPanel } from "./PropertiesPanel";
import { DrawToolbar } from "./DrawToolbar";
import { BuilderCanvas } from "@/scene/BuilderCanvas";

export function EditorShell() {
  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-border overflow-y-auto bg-muted/30 flex-shrink-0">
          <DrawToolbar />
        </div>

        <div className="flex-1 relative min-w-0">
          <BuilderCanvas />
        </div>

        <div className="w-72 border-l border-border overflow-y-auto bg-muted/30 flex-shrink-0">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
