import { useQuery } from "@tanstack/react-query";
import { fetchPresets, type PresetEntry } from "@/lib/api/presets";

export interface UsePresetsState {
  presets: PresetEntry[];
  loading: boolean;
  error: Error | null;
}

export function usePresets(): UsePresetsState {
  const { data, isLoading, error } = useQuery({
    queryKey: ["simulator-presets"],
    queryFn: fetchPresets,
  });
  return {
    presets: data ?? [],
    loading: isLoading,
    error: (error as Error | null) ?? null,
  };
}
