import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  duration?: number; // Duration in milliseconds
  start?: number; // Starting value
  decimals?: number; // Number of decimal places
  useEasing?: boolean; // Use easing function
}

/**
 * Custom hook for animating number counters
 *
 * @example
 * const count = useCountUp(1234, { duration: 1000, decimals: 0 });
 * return <div>{count}</div>;
 */
export function useCountUp(
  end: number,
  {
    duration = 800,
    start = 0,
    decimals = 0,
    useEasing = true,
  }: UseCountUpOptions = {}
) {
  const [count, setCount] = useState(start);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const prevEndRef = useRef(end);

  useEffect(() => {
    // Reset start time if end value changes
    if (prevEndRef.current !== end) {
      startTimeRef.current = undefined;
      prevEndRef.current = end;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Easing function (ease-out cubic)
      const easedProgress = useEasing
        ? 1 - Math.pow(1 - progress, 3)
        : progress;

      const currentCount = start + (end - start) * easedProgress;

      setCount(currentCount);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure we end at exact value
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, start, useEasing]);

  // Format the count with specified decimals
  return Number(count.toFixed(decimals));
}

/**
 * Hook variant that returns a formatted string
 */
export function useFormattedCountUp(
  end: number,
  options: UseCountUpOptions & { formatter?: (value: number) => string } = {}
) {
  const { formatter = (val) => val.toLocaleString(), ...countUpOptions } = options;
  const count = useCountUp(end, countUpOptions);
  return formatter(count);
}
