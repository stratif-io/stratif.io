import { create } from "zustand";

interface State {
  index: number | null;
  setIndex: (i: number) => void;
  clear: () => void;
}

export const useHoverGuide = create<State>((set) => ({
  index: null,
  setIndex: (i) => set({ index: i }),
  clear: () => set({ index: null }),
}));
