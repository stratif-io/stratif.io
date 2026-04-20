import { useMemo, useState } from "react";
import { Button, Input, ScrollArea } from "@stratif-io/web";
import type { PresetEntry } from "@/lib/api/presets";

interface Props {
  presets: PresetEntry[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  onNewBlank: () => void;
}

export function PresetLibrary({
  presets,
  selectedName,
  onSelect,
  onNewBlank,
}: Props) {
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<string | null>(null);

  const domains = useMemo(
    () => Array.from(new Set(presets.map((p) => p.domain))).sort(),
    [presets],
  );

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return presets.filter((p) => {
      if (domain && p.domain !== domain) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [presets, search, domain]);

  return (
    <aside className="w-[220px] border-r p-3 flex flex-col gap-3 overflow-y-auto">
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={onNewBlank}
      >
        + New blank
      </Button>

      <Input
        type="search"
        placeholder="Search"
        aria-label="Search presets"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />

      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDomain(null)}
          data-active={domain === null}
          className="rounded-full h-6 px-2 py-0 text-xs data-[active=true]:bg-accent"
        >
          all
        </Button>
        {domains.map((d) => (
          <Button
            key={d}
            size="sm"
            variant="outline"
            onClick={() => setDomain(d)}
            data-active={domain === d}
            className="rounded-full h-6 px-2 py-0 text-xs data-[active=true]:bg-accent"
          >
            {d}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <ul className="flex flex-col gap-1">
          {filtered.map((p) => (
            <li key={p.name}>
              <Button
                variant="ghost"
                onClick={() => onSelect(p.name)}
                data-selected={selectedName === p.name}
                className="w-full justify-start h-auto flex-col items-start px-2 py-1 text-left data-[selected=true]:bg-accent"
              >
                <div className="text-sm">{p.name}</div>
                {p.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {p.description}
                  </div>
                )}
                <div className="text-[10px] uppercase text-muted-foreground">
                  {p.domain}
                </div>
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}
