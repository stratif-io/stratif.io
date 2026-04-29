import { motion } from "framer-motion";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { useEffect, useState } from "react";

type Phase = "idle" | "loading" | "completing";

/**
 * A thin progress bar at the top of a card.
 * - While loading: indeterminate sweep
 * - On completion: fills to 100% then fades out
 * Parent card must have `relative overflow-hidden`.
 */
export function CardLoadingBar({ loading }: { loading?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(loading ? "loading" : "idle");

  useEffect(() => {
    if (loading) {
      setPhase("loading"); // H4: always reset unconditionally
    } else if (phase === "loading") {
      setPhase("completing");
    }
    // idle is terminal — reset handled by next loading=true
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "idle") return null;

  if (prefersReducedMotion) {
    return (
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/50" />
    );
  }

  if (phase === "loading") {
    return (
      <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
        <motion.div
          className="absolute h-full bg-primary/60"
          style={{ width: "45%" }}
          initial={{ x: "-145%" }}
          animate={{ x: "220%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  // completing — fill to 100% then fade out in one sequence
  return (
    <motion.div
      key="completing"
      className="absolute top-0 left-0 right-0 h-[2px] bg-primary/70"
      style={{ transformOrigin: "left center" }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1, opacity: [1, 1, 0] }}
      transition={{ duration: 0.5, times: [0, 0.6, 1] }}
      onAnimationComplete={() => setPhase("idle")}
    />
  );
}
