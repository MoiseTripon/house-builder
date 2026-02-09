import { EditorShell } from "@/features/editor";
import { BuilderCanvas } from "@/scene/BuilderCanvas";

export function BuilderScreen() {
  return (
    <EditorShell>
      <BuilderCanvas />
    </EditorShell>
  );
}
