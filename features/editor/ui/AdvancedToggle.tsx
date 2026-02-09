"use client";

import React from "react";
import { useEditorStore } from "../model/editor.store";
import { Segmented } from "@/shared/ui/Segmented";

export function AdvancedToggle() {
  const advancedMode = useEditorStore((s) => s.advancedMode);
  const setAdvancedMode = useEditorStore((s) => s.setAdvancedMode);

  return (
    <Segmented
      value={advancedMode}
      onChange={setAdvancedMode}
      options={[
        { value: "simple", label: "Simple" },
        { value: "advanced", label: "Advanced" },
      ]}
    />
  );
}
