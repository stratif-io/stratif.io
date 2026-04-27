import { AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTimeoutError } from "@/lib/api/semaphore";

interface QueryErrorProps {
  error: Error | null | unknown;
  className?: string;
  onRetry?: () => void;
  /**
   * When provided together with a timeout error, the user-facing message
   * includes the configured timeout (e.g. "Query timed out after 10s").
   */
  timeoutSeconds?: number;
}

export function QueryError({
  error,
  className,
  onRetry,
  timeoutSeconds,
}: QueryErrorProps) {
  if (!error) return null;
  const timedOut = isTimeoutError(error);
  const message = timedOut
    ? `Query timed out${typeof timeoutSeconds === "number" ? ` after ${timeoutSeconds}s` : ""}${
        onRetry ? " — click to retry" : ""
      }`
    : error instanceof Error
      ? error.message
      : "Failed to load data. Please try again.";
  const Icon = timedOut ? Clock : AlertCircle;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center gap-3",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
