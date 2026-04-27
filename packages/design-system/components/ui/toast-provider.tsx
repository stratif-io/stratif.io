import { Toaster } from "sonner";

interface ToastProviderProps {
  theme?: "light" | "dark" | "system";
}

/**
 * Toast notification provider using Sonner
 * Automatically adapts to light/dark theme
 */
export function ToastProvider({ theme = "system" }: ToastProviderProps) {
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
        className: "sonner-toast",
      }}
      richColors
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { toast } from "sonner";
