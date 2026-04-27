import { Component, useState, useEffect, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import {
  AppHeader,
  AppSidebar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@stratif-io/design-system";
import {
  LayoutDashboard,
  TrendingUp,
  RefreshCw,
  MessageCircle,
  Rocket,
  Target,
  Zap,
  Users,
  Moon,
  Sun,
} from "lucide-react";
import { StudioLayout } from "./features/studio/StudioLayout";
import { SavePanel } from "./features/save/SavePanel";
import { usePresets } from "./features/presets/usePresets";
import { useSeederStore, blankConfig } from "./stores/seederStore";
import { useTheme } from "./hooks/useTheme";
import { cn } from "./lib/cn";
import { defaultAnomaly } from "./lib/twin";
import { resolveScale } from "./lib/twin/utils";
import { stringifyConfigYaml } from "./lib/yaml/roundTrip";

const SECTION_TITLES: Record<string, string> = {
  studio: "Studio",
  growth: "Growth",
  retention: "Retention",
  engagement: "Engagement",
  virality: "Virality",
  scale: "Scale",
  events: "Event editor",
};

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-6 text-center">
            Something went wrong. Reload the page or pick a different preset.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { presets, loading, error } = usePresets();
  const config = useSeederStore((s) => s.config);
  const dirty = useSeederStore((s) => s.dirty);
  const loadPreset = useSeederStore((s) => s.loadPreset);
  const sidebarCollapsed = useSeederStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSeederStore((s) => s.setSidebarCollapsed);
  const activeSection = useSeederStore((s) => s.activeSection);
  const setActiveSection = useSeederStore((s) => s.setActiveSection);

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<
    { kind: "load"; name: string } | { kind: "blank" } | null
  >(null);

  // TopBar state
  const { theme, toggleTheme } = useTheme();
  const uiStartDate = useSeederStore((s) => s.uiStartDate);
  const uiEndDate = useSeederStore((s) => s.uiEndDate);
  const setUiStartDate = useSeederStore((s) => s.setUiStartDate);
  const setUiEndDate = useSeederStore((s) => s.setUiEndDate);
  const setScaleConfig = useSeederStore((s) => s.setScaleConfig);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);

  const anomalies = config.anomalies ?? [];
  const scaleAxis = config.axes.scale ?? "small";
  const scaleOverride = config.scale_config;
  const resolvedScale = useMemo(
    () => resolveScale(scaleAxis, scaleOverride),
    [scaleAxis, scaleOverride],
  );
  const { window_days } = resolvedScale;

  const handleAddEvent = () => {
    const duration = Math.max(5, Math.floor(window_days * 0.1));
    const maxStart = Math.max(0, window_days - duration - 1);
    const start = Math.floor(Math.random() * maxStart);
    setAnomalies([
      ...anomalies,
      defaultAnomaly("product_launch", start, duration),
    ]);
  };

  const dateRangeInvalid = !!(
    uiStartDate &&
    uiEndDate &&
    new Date(uiStartDate + "T00:00:00") >= new Date(uiEndDate + "T00:00:00")
  );

  const handleStartDate = (value: string) => {
    setUiStartDate(value);
    if (value && uiEndDate) {
      const start = new Date(value + "T00:00:00");
      const end = new Date(uiEndDate + "T00:00:00");
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      const delta = end.getTime() - start.getTime();
      if (delta <= 0) return;
      const days = Math.max(1, Math.round(delta / 86_400_000));
      setScaleConfig({ ...config.scale_config, window_days: days });
    }
  };

  const handleEndDate = (value: string) => {
    setUiEndDate(value);
    if (uiStartDate && value) {
      const start = new Date(uiStartDate + "T00:00:00");
      const end = new Date(value + "T00:00:00");
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      const delta = end.getTime() - start.getTime();
      if (delta <= 0) return;
      const days = Math.max(1, Math.round(delta / 86_400_000));
      setScaleConfig({ ...config.scale_config, window_days: days });
    }
  };

  const handleTotalUsers = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      setScaleConfig({ ...config.scale_config, total_users: n });
    }
  };

  const inputInvalid = "border-destructive focus-visible:ring-destructive";
  const inputNormal = "border-border";

  const confirmAndRun = (
    intent: { kind: "load"; name: string } | { kind: "blank" },
  ) => {
    if (intent.kind === "load") {
      const preset = presets.find((p) => p.name === intent.name);
      if (!preset || !preset.config) return;
      loadPreset(preset.config);
      setSelectedName(intent.name);
    } else {
      loadPreset(blankConfig());
      setSelectedName(null);
    }
  };

  const handleSelectPreset = (name: string | null) => {
    const intent =
      name === null
        ? { kind: "blank" as const }
        : { kind: "load" as const, name };
    if (dirty) {
      setPendingIntent(intent);
      return;
    }
    confirmAndRun(intent);
  };

  const handleConfirmDiscard = () => {
    if (!pendingIntent) return;
    confirmAndRun(pendingIntent);
    setPendingIntent(null);
  };

  const urlSyncedRef = useRef(false);

  useEffect(() => {
    if (loading || presets.length === 0 || urlSyncedRef.current) return;
    urlSyncedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const urlName = params.get("preset");
    if (urlName && presets.some((p) => p.name === urlName)) {
      const preset = presets.find((p) => p.name === urlName);
      if (preset && preset.config) {
        loadPreset(preset.config);
        setSelectedName(urlName);
      }
    }
  }, [loading, presets, loadPreset]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedName) {
      url.searchParams.set("preset", selectedName);
    } else {
      url.searchParams.delete("preset");
    }
    window.history.replaceState({}, "", url.toString());
  }, [selectedName]);

  const sidebarSections = [
    {
      label: "Simulation",
      items: [
        {
          key: "studio",
          label: "Studio",
          icon: <LayoutDashboard size={16} />,
          active: activeSection === "studio",
          onClick: () => setActiveSection("studio"),
        },
        {
          key: "growth",
          label: "Growth",
          icon: <TrendingUp size={16} />,
          active: activeSection === "growth",
          onClick: () => setActiveSection("growth"),
        },
        {
          key: "retention",
          label: "Retention",
          icon: <RefreshCw size={16} />,
          active: activeSection === "retention",
          onClick: () => setActiveSection("retention"),
        },
        {
          key: "engagement",
          label: "Engagement",
          icon: <MessageCircle size={16} />,
          active: activeSection === "engagement",
          onClick: () => setActiveSection("engagement"),
        },
        {
          key: "virality",
          label: "Virality",
          icon: <Rocket size={16} />,
          active: activeSection === "virality",
          onClick: () => setActiveSection("virality"),
        },
        {
          key: "scale",
          label: "Scale",
          icon: <Target size={16} />,
          active: activeSection === "scale",
          onClick: () => setActiveSection("scale"),
        },
      ],
    },
    {
      label: "Events",
      items: [
        {
          key: "events",
          label: "Event editor",
          icon: <Zap size={16} />,
          active: activeSection === "events",
          onClick: () => setActiveSection("events"),
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        sections={sidebarSections}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        brand={
          !sidebarCollapsed ? (
            <span className="text-sm font-bold tracking-tight">
              Seeder Studio
            </span>
          ) : undefined
        }
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={SECTION_TITLES[activeSection] ?? "Studio"}
          badge={
            dirty ? (
              <Badge variant="outline" className="text-[10px] h-5">
                Modified
              </Badge>
            ) : undefined
          }
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Select
                value={
                  presets.length === 0
                    ? undefined
                    : (selectedName ?? "__blank__")
                }
                onValueChange={(val) =>
                  handleSelectPreset(val === "__blank__" ? null : val)
                }
                disabled={presets.length === 0}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue
                    placeholder={
                      presets.length === 0 ? "Loading…" : "Select preset…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__blank__">New blank</SelectItem>
                  {presets.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {resolvedScale.mode === "rate" ? (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded px-2 py-0.5 shrink-0">
                  📈 Rate: {resolvedScale.starting_rate} users/day
                </span>
              ) : (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded px-2 py-0.5 shrink-0">
                  🎯 Goal: {resolvedScale.total_users} users
                </span>
              )}

              <div className="flex items-center gap-1.5">
                <label htmlFor="start-date" className="sr-only">
                  Start date
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={uiStartDate ?? ""}
                  onChange={(e) => handleStartDate(e.target.value)}
                  aria-invalid={dateRangeInvalid}
                  title={
                    dateRangeInvalid
                      ? "Start date must be before end date"
                      : undefined
                  }
                  className={cn(
                    "h-8 w-32 bg-muted/40 text-xs",
                    dateRangeInvalid ? inputInvalid : inputNormal,
                  )}
                />
                <span className="text-muted-foreground text-xs">→</span>
                <label htmlFor="end-date" className="sr-only">
                  End date
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={uiEndDate ?? ""}
                  onChange={(e) => handleEndDate(e.target.value)}
                  aria-invalid={dateRangeInvalid}
                  title={
                    dateRangeInvalid
                      ? "End date must be after start date"
                      : undefined
                  }
                  className={cn(
                    "h-8 w-32 bg-muted/40 text-xs",
                    dateRangeInvalid ? inputInvalid : inputNormal,
                  )}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Users
                  size={13}
                  className="text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <label htmlFor="total-users" className="sr-only">
                  Total users
                </label>
                <Input
                  id="total-users"
                  type="number"
                  min={1}
                  placeholder="users"
                  value={config.scale_config?.total_users ?? ""}
                  onChange={(e) => handleTotalUsers(e.target.value)}
                  className="h-8 w-24 bg-muted/40 text-xs"
                />
              </div>

              <Button size="sm" variant="outline" onClick={handleAddEvent}>
                + Event
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                onClick={toggleTheme}
                className="w-8 h-8 p-0"
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </Button>
            </div>
          )}
        </AppHeader>

        {error && (
          <div className="px-4 py-2 text-sm text-destructive border-b">
            Error loading presets: {error.message}
          </div>
        )}

        <main className="flex-1 overflow-hidden flex min-h-0">
          <ErrorBoundary>
            {/* @ts-expect-error — StudioLayout will accept activeSection in Task 8 */}
            <StudioLayout activeSection={activeSection} />
          </ErrorBoundary>
          <SavePanel yaml={stringifyConfigYaml(config)} />
        </main>
      </div>

      <Dialog
        open={pendingIntent !== null}
        onOpenChange={(open) => !open && setPendingIntent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You&apos;ve made changes to{" "}
              <span className="font-mono">{config.name}</span>. These changes
              will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingIntent(null)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
