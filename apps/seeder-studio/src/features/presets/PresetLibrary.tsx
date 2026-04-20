import { useMemo, useState } from "react";
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
      <button
        onClick={onNewBlank}
        className="w-full rounded border border-dashed px-2 py-1 text-sm hover:bg-accent"
      >
        + New blank
      </button>

      <input
        type="search"
        placeholder="Search"
        aria-label="Search presets"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded border px-2 py-1 text-sm"
      />

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setDomain(null)}
          data-active={domain === null}
          className="rounded-full border px-2 py-0.5 text-xs data-[active=true]:bg-accent"
        >
          all
        </button>
        {domains.map((d) => (
          <button
            key={d}
            onClick={() => setDomain(d)}
            data-active={domain === d}
            className="rounded-full border px-2 py-0.5 text-xs data-[active=true]:bg-accent"
          >
            {d}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-1">
        {filtered.map((p) => (
          <li key={p.name}>
            <button
              onClick={() => onSelect(p.name)}
              data-selected={selectedName === p.name}
              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent data-[selected=true]:bg-accent"
            >
              <div>{p.name}</div>
              {p.description && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {p.description}
                </div>
              )}
              <div className="text-[10px] uppercase text-muted-foreground">
                {p.domain}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
