import {
  Component,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import {
  AppHeader,
  AppSidebar,
  AxisPopover,
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
import type { AxisDisplayValue, SidebarItem } from "@stratif-io/design-system";
import {
  LayoutDashboard,
  TrendingUp,
  RefreshCw,
  MessageCircle,
  Rocket,
  Target,
  Zap,
  Activity,
  Users,
  Moon,
  Sun,
} from "lucide-react";
import { StudioLayout } from "./features/studio/StudioLayout";
import { SavePanel } from "./features/save/SavePanel";
import { usePresets } from "./features/presets/usePresets";
import { useSeederStore, blankConfig } from "./stores/seederStore";
import { AXIS_SPEC } from "./lib/twin/axisSpec";
import { useTheme } from "./hooks/useTheme";
import { cn } from "./lib/cn";
import { defaultAnomaly } from "./lib/twin";
import { resolveScale } from "./lib/twin/utils";
import { stringifyConfigYaml } from "./lib/yaml/roundTrip";

function presetLabel(name: string): string {
  const n = name.toLowerCase();
  const emoji = n.includes("dating")
    ? "💘"
    : n.includes("game") || n.includes("casual")
      ? "🎮"
      : n.includes("saas")
        ? "🚀"
        : n.includes("commerce") || n.includes("shopify")
          ? "🛒"
          : n.includes("retail") || n.includes("sears")
            ? "🏪"
            : n.includes("marketplace") || n.includes("airbnb")
              ? "🤝"
              : n.includes("streaming") || n.includes("netflix")
                ? "🎬"
                : n.includes("social")
                  ? "📱"
                  : n.includes("fintech")
                    ? "💳"
                    : "";
  return emoji ? `${emoji} ${name}` : name;
}

const SECTION_TITLES: Record<string, string> = {
  studio: "Studio",
  events: "Event simulator",
};

const AXIS_SPARKLINES: Record<string, Record<string, string>> = {
  growth: {
    declining: "0,4 14,8 28,14 40,20 52,26",
    flat: "0,14 14,14 28,14 40,14 52,14",
    steady: "0,22 14,18 28,14 40,10 52,6",
    strong: "0,26 12,22 24,16 36,9 52,4",
    hockey_stick: "0,24 14,23 24,22 32,20 36,14 42,8 52,3",
    explosive: "0,26 10,22 22,16 36,8 52,2",
    seasonal: "0,14 10,8 26,3 36,8 46,14 52,18",
  },
  stickiness: {
    one_shot: "0,4 13,16 26,22 39,25 52,26",
    churn_heavy: "0,6 13,14 26,18 39,21 52,22",
    normal: "0,8 13,12 26,16 39,18 52,20",
    sticky: "0,10 13,11 26,12 39,13 52,14",
    addictive: "0,12 13,12 26,12 39,11 52,11",
    no_one_churns: "0,14 13,14 26,14 39,14 52,14",
  },
  engagement_depth: {
    shallow: "0,22 26,22 52,22",
    medium: "0,14 26,14 52,14",
    deep: "0,6 26,6 52,6",
  },
  virality: {
    none: "0,14 52,14",
    weak: "0,18 26,14 52,10",
    moderate: "0,22 26,14 52,4",
    strong_viral: "0,26 20,20 36,10 52,2",
  },
  scale: {
    tiny: "0,22 52,22",
    small: "0,18 52,18",
    medium: "0,12 52,12",
    large: "0,6 52,6",
  },
  anomalies: {
    none: "0,14 13,14 26,14 39,14 52,14",
    clean: "0,12 10,16 20,13 30,15 40,12 52,14",
    moderate: "0,10 8,18 16,11 24,17 32,9 40,16 52,13",
    explicit: "0,8 7,20 14,9 21,19 28,8 35,18 42,11 52,17",
  },
};

const SIDEBAR_AXES: { id: string; label: string; icon: ReactNode }[] = [
  { id: "growth", label: "Growth", icon: <TrendingUp size={16} /> },
  { id: "stickiness", label: "Retention", icon: <RefreshCw size={16} /> },
  {
    id: "engagement_depth",
    label: "Engagement",
    icon: <MessageCircle size={16} />,
  },
  { id: "virality", label: "Virality", icon: <Rocket size={16} /> },
  { id: "scale", label: "Scale", icon: <Target size={16} /> },
  { id: "anomalies", label: "Noise", icon: <Activity size={16} /> },
];

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
  const studioExpanded = useSeederStore((s) => s.studioExpanded);
  const setStudioExpanded = useSeederStore((s) => s.setStudioExpanded);
  const setAxis = useSeederStore((s) => s.setAxis);

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
    const targetName =
      urlName && presets.some((p) => p.name === urlName)
        ? urlName
        : (presets.find((p) => p.name.toLowerCase().includes("dating"))?.name ??
          null);
    if (targetName) {
      const preset = presets.find((p) => p.name === targetName);
      if (preset?.config) {
        loadPreset(preset.config);
        setSelectedName(targetName);
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

  const sidebarSections = useMemo(() => {
    const resolvedAxes = config.axes ?? {};

    const axisChildren: SidebarItem[] = SIDEBAR_AXES.map(
      ({ id, label, icon }) => {
        const currentVal = resolvedAxes[id] ?? AXIS_SPEC[id]?.default ?? "";
        const displayLabel =
          AXIS_SPEC[id]?.values.find((v) => v.value === currentVal)?.label ??
          currentVal;
        return {
          key: id,
          label,
          icon,
          active: false,
          onClick: () => {},
          badge: displayLabel,
        };
      },
    );

    return [
      {
        label: "",
        items: [
          {
            key: "studio",
            label: "Studio",
            icon: <LayoutDashboard size={16} />,
            active: activeSection === "studio",
            onClick: () => setActiveSection("studio"),
            expanded: studioExpanded,
            onToggleExpand: () => setStudioExpanded(!studioExpanded),
            children: axisChildren,
          },
        ],
      },
      {
        label: "",
        items: [
          {
            key: "events",
            label: "Event simulator",
            icon: <Zap size={16} />,
            active: activeSection === "events",
            onClick: () => setActiveSection("events"),
          },
        ],
      },
    ];
  }, [
    config.axes,
    activeSection,
    studioExpanded,
    setActiveSection,
    setStudioExpanded,
  ]);

  const itemWrapper = useCallback(
    (item: SidebarItem, btn: ReactNode) => {
      const axisDef = AXIS_SPEC[item.key];
      if (!axisDef) return btn;
      const currentVal = (config.axes ?? {})[item.key] ?? axisDef.default;
      const popoverValues: AxisDisplayValue[] = axisDef.values.map((v) => ({
        value: v.value,
        label: v.label,
        description: v.description,
        sparklinePoints: AXIS_SPARKLINES[item.key]?.[v.value] ?? "0,14 52,14",
      }));
      return (
        <AxisPopover
          axisId={item.key}
          values={popoverValues}
          currentValue={currentVal}
          onSelect={(val) => {
            setAxis(item.key, val);
            if (item.key === "scale") {
              const p = axisDef.values.find((v) => v.value === val)?.params;
              if (p) {
                setScaleConfig({
                  total_users: p.total_users,
                  window_days: p.window_days,
                });
              }
            }
          }}
        >
          {btn}
        </AxisPopover>
      );
    },
    [config.axes, setAxis, setScaleConfig],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        sections={sidebarSections}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        itemWrapper={itemWrapper}
        brand={
          <div
            className={cn(
              "flex items-center min-w-0 w-full",
              sidebarCollapsed ? "justify-center gap-0" : "gap-2.5",
            )}
          >
            <img
              src="/favicon-color.svg"
              alt="stratif.io"
              className="h-8 w-8 shrink-0"
            />
            <div
              className={cn(
                "flex flex-col min-w-0 transition-[opacity,max-width] duration-200 overflow-hidden",
                sidebarCollapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs",
              )}
            >
              <img
                src={theme === "dark" ? "/text-dark.svg" : "/text-light.svg"}
                alt=""
                className="h-5 w-auto shrink-0"
              />
              <span className="text-[10px] font-medium text-muted-foreground tracking-wide whitespace-nowrap">
                Event Simulator
              </span>
            </div>
          </div>
        }
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader>
          <span className="text-sm font-semibold tracking-tight shrink-0">
            {SECTION_TITLES[activeSection] ?? "Studio"}
          </span>
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
                <SelectTrigger className="w-52 h-8 text-xs">
                  <SelectValue
                    placeholder={
                      presets.length === 0 ? "Loading…" : "Select scenario…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__blank__">✨ New blank</SelectItem>
                  {presets.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {presetLabel(p.name)}
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
          <div className="flex-1 min-w-0 overflow-hidden">
            <ErrorBoundary>
              <StudioLayout activeSection={activeSection} />
            </ErrorBoundary>
          </div>
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
