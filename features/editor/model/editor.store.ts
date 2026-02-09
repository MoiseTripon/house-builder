import { create } from "zustand";

type EditorState = {
  mode: "select";
};

export const useEditorStore = create<EditorState>(() => ({
  mode: "select",
}));
