import { useSeederStore } from "@/stores/seederStore";

const DOMAINS = [
  "saas",
  "ecommerce",
  "casual_game",
  "gaming_hardcore",
  "social",
  "streaming",
  "dating",
  "marketplace",
  "fintech",
  "retail",
];

const NAME_RE = /^[a-z][a-z0-9_]*$/;

export function IdentitySection() {
  const config = useSeederStore((s) => s.config);
  const setName = useSeederStore((s) => s.setName);
  const setDescription = useSeederStore((s) => s.setDescription);
  const setDomain = useSeederStore((s) => s.setDomain);
  const nameValid = NAME_RE.test(config.name);

  return (
    <section className="rounded border p-3 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Identity</h2>
      <label className="flex flex-col gap-1 text-xs">
        Name
        <input
          aria-label="Name"
          value={config.name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        />
        {!nameValid && (
          <span className="text-destructive">
            Use lowercase letters, digits, and underscores (must start with a
            letter).
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Description
        <textarea
          aria-label="Description"
          value={config.description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
          rows={2}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Domain
        <select
          aria-label="Domain"
          value={config.domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
