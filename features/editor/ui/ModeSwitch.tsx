"use client";

import React from "react";
import { useEditorStore } from "../model/editor.store";
import { Segmented } from "@/shared/ui/Segmented";

export function ModeSwitch() {
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);

  return (
    <Segmented
      value={mode}
      onChange={setMode}
      options={[
        { value: "select", label: "Select (V)" },
        { value: "draw", label: "Draw (D)" },
        { value: "split", label: "Split (S)" },
      ]}
    />
  );
}
