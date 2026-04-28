import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { HeaderOptionsPreview } from "./dev/HeaderOptionsPreview";
import "./index.css";
import "katex/dist/katex.min.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const isDev = window.location.pathname === "/dev";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isDev ? (
      <HeaderOptionsPreview />
    ) : (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )}
  </React.StrictMode>,
);
