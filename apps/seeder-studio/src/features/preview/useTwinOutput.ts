import { useState, useEffect } from "react";
import { useSeederStore } from "@/stores/seederStore";
import type { TwinOutput } from "@/lib/api/simulation";
import { fetchSimulation } from "@/lib/api/simulation";
import { resolveAxes } from "@/lib/twin";

const EMPTY_OUTPUT: TwinOutput = {
  days: 0,
  arrivals: [],
  pipeline: { growth: [], anomalies: [], jitter: [], virality: [] },
  events: [],
  activeUsers: [],
  newUsers: [],
  churnedUsers: [],
  reactivatedUsers: [],
  stickiness: [],
  totalUsers: [],
};

export interface TwinOutputWithLoading extends TwinOutput {
  isLoading: boolean;
}

export function useTwinOutput(): TwinOutputWithLoading {
  const config = useSeederStore((s) => s.config);
  const [output, setOutput] = useState<TwinOutput>(EMPTY_OUTPUT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Set loading immediately when config changes (before debounce fires)
    setIsLoading(true);

    const timer = setTimeout(() => {
      // Resolve axis defaults before sending to the backend so the backend
      // applies the same axes that the formula panel displays.
      const resolvedConfig = {
        ...config,
        axes: resolveAxes(config.axes ?? {}),
      };
      fetchSimulation(resolvedConfig)
        .then((result) => {
          if (!cancelled) {
            setOutput(result);
            setIsLoading(false);
          }
        })
        .catch(() => {
          // Keep previous output on error (server may be starting up)
          if (!cancelled) setIsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config]);

  return { ...output, isLoading };
}
