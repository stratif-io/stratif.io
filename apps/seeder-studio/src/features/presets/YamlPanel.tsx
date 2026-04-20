import { useEffect, useRef, useState } from "react";
import { Button } from "@stratif-io/web";
import { parseConfigYaml } from "@/lib/yaml/roundTrip";
import type { SimulationConfig } from "@/types/simulation";

interface Props {
  yaml: string;
  onValidConfig: (config: SimulationConfig) => void;
  debounceMs?: number;
}

export function YamlPanel({ yaml, onValidConfig, debounceMs = 150 }: Props) {
  const [value, setValue] = useState(yaml);
  const [error, setError] = useState<{ message: string; line?: number } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(yaml);
    setError(null);
  }, [yaml]);

  const handleChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const result = parseConfigYaml(next);
      if (result.ok) {
        setError(null);
        onValidConfig(result.config);
      } else {
        setError(result.error);
      }
    }, debounceMs);
  };

  return (
    <section className="h-full w-full flex flex-col">
      <header className="flex items-center justify-between p-2 border-b">
        <div className="text-sm font-semibold">YAML</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(value)}
          className="h-6 text-xs px-2"
        >
          Copy
        </Button>
      </header>
      <div className="flex-1 overflow-auto" data-testid="yaml-editor">
        <textarea
          data-testid="yaml-textarea"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-full resize-none p-2 font-mono text-xs outline-none"
          spellCheck={false}
        />
      </div>
      {error && (
        <div role="alert" className="p-2 text-xs text-destructive border-t">
          YAML error{" "}
          {error.line !== undefined ? `(line ${error.line + 1})` : ""}:{" "}
          {error.message}
        </div>
      )}
    </section>
  );
}
