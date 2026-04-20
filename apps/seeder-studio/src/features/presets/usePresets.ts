import { useEffect, useState } from "react";
import { fetchPresets, type PresetEntry } from "@/lib/api/presets";

export interface UsePresetsState {
  presets: PresetEntry[];
  loading: boolean;
  error: Error | null;
}

export function usePresets(): UsePresetsState {
  const [state, setState] = useState<UsePresetsState>({
    presets: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchPresets()
      .then((presets) => {
        if (!cancelled) setState({ presets, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ presets: [], loading: false, error: err });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
