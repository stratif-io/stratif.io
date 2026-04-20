import { useMemo } from "react";
import { useSeederStore } from "@/stores/seederStore";
import { runTwin, type TwinOutput } from "@/lib/twin";

export function useTwinOutput(): TwinOutput {
  const config = useSeederStore((s) => s.config);
  return useMemo(() => runTwin({ config }), [config]);
}
