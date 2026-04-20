import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@stratif-io/web";
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
    <section aria-labelledby="identity-heading" className="space-y-3">
      <h2 id="identity-heading" className="text-base font-semibold">
        Identity
      </h2>
      <div className="flex flex-col gap-1">
        <Label htmlFor="identity-name" className="text-[13px] font-medium">
          Name
        </Label>
        <Input
          id="identity-name"
          aria-label="Name"
          aria-invalid={!nameValid}
          aria-describedby={!nameValid ? "identity-name-error" : undefined}
          value={config.name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 md:h-8 text-base md:text-sm"
        />
        {!nameValid && (
          <span
            id="identity-name-error"
            role="alert"
            className="text-xs text-destructive"
          >
            Use lowercase letters, digits, and underscores (must start with a
            letter).
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="identity-description"
          className="text-[13px] font-medium"
        >
          Description
        </Label>
        <Textarea
          id="identity-description"
          aria-label="Description"
          value={config.description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          className="text-base md:text-sm min-h-[72px] md:min-h-[56px]"
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="identity-domain" className="text-[13px] font-medium">
          Domain
        </Label>
        <Select value={config.domain} onValueChange={setDomain}>
          <SelectTrigger
            id="identity-domain"
            aria-label="Domain"
            className="h-10 md:h-8 text-base md:text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
