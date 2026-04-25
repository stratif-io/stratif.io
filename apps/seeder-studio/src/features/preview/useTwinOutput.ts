import { useState, useEffect } from "react";
import { useSeederStore } from "@/stores/seederStore";
import type { TwinOutput } from "@/lib/twin/types";
import { fetchSimulation } from "@/lib/api/simulation";

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

export function useTwinOutput(): TwinOutput {
  const config = useSeederStore((s) => s.config);
  const [output, setOutput] = useState<TwinOutput>(EMPTY_OUTPUT);

  useEffect(() => {
    let cancelled = false;
    fetchSimulation(config)
      .then((result) => {
        if (!cancelled) setOutput(result);
      })
      .catch(() => {
        // Keep previous output on error (server may be starting up)
      });
    return () => {
      cancelled = true;
    };
  }, [config]);

  return output;
}
