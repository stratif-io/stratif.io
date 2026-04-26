import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "../TopBar";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

// useTwinOutput (now used in TopBar) calls fetch; stub it globally for all TopBar tests
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          days: 0,
          new_users: [],
          active_users: [],
          churned: [],
          reactivated: [],
          events: [],
          stickiness: [],
          growth_curve: [],
          anomaly_curve: [],
          jitter_curve: [],
          virality_curve: [],
        }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const PRESETS = [
  {
    name: "saas-growth",
    description: "SaaS growth scenario",
    config: blankConfig(),
  },
  {
    name: "e-commerce",
    description: "E-commerce scenario",
    config: blankConfig(),
  },
];

beforeEach(() => {
  useSeederStore.setState({
    config: blankConfig(),
    dirty: false,
    uiStartDate: null,
    uiEndDate: null,
  });
});

describe("TopBar", () => {
  it("renders the app title", () => {
    render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    expect(screen.getByText("Seeder Studio")).toBeInTheDocument();
  });

  it("renders start and end date inputs", () => {
    render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it("renders total users input", () => {
    render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    expect(screen.getByLabelText(/total users/i)).toBeInTheDocument();
  });

  it("updates uiStartDate in store when start date changes", async () => {
    const user = userEvent.setup();
    render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    const input = screen.getByLabelText(/start date/i);
    await user.clear(input);
    await user.type(input, "2024-01-01");
    expect(useSeederStore.getState().uiStartDate).toBe("2024-01-01");
  });

  it("computes window_days when both dates are set", async () => {
    const user = userEvent.setup();
    render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    const startInput = screen.getByLabelText(/start date/i);
    const endInput = screen.getByLabelText(/end date/i);
    await user.clear(startInput);
    await user.type(startInput, "2024-01-01");
    await user.clear(endInput);
    await user.type(endInput, "2024-04-10");
    const { window_days } = useSeederStore.getState().config.scale_config ?? {};
    expect(window_days).toBeGreaterThan(0);
  });

  it("header element has h-14 class for correct height", () => {
    const { container } = render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header).toHaveClass("h-14");
  });

  it("renders 'New blank' option and preset names in Select", async () => {
    const user = userEvent.setup();
    render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    // Open the select
    await user.click(screen.getByRole("combobox"));
    expect(screen.getAllByText("New blank").length).toBeGreaterThan(0);
    expect(screen.getByText("saas-growth")).toBeInTheDocument();
    expect(screen.getByText("e-commerce")).toBeInTheDocument();
  });

  it("calls onSelectPreset(null) when 'New blank' is selected", async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();
    render(
      <TopBar
        presets={PRESETS}
        selectedName="saas-growth"
        onSelectPreset={onSelectPreset}
      />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("New blank"));
    expect(onSelectPreset).toHaveBeenCalledWith(null);
  });

  it("calls onSelectPreset with preset name when a preset is selected", async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();
    render(
      <TopBar
        presets={PRESETS}
        selectedName={null}
        onSelectPreset={onSelectPreset}
      />,
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("saas-growth"));
    expect(onSelectPreset).toHaveBeenCalledWith("saas-growth");
  });

  it("does not crash when a partial/invalid start date is typed", async () => {
    const user = userEvent.setup();
    render(
      <TopBar presets={PRESETS} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    const startInput = screen.getByLabelText(/start date/i);
    await user.clear(startInput);
    await user.type(startInput, "2024-0");
    // window_days must remain a valid number — not NaN
    const { window_days } = useSeederStore.getState().config.scale_config ?? {};
    expect(Number.isFinite(window_days ?? 90)).toBe(true);
  });

  it("Select is disabled and shows 'Loading…' placeholder when presets is empty", () => {
    render(
      <TopBar presets={[]} selectedName={null} onSelectPreset={vi.fn()} />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});

const mockPresets = [
  { name: "Viral", description: "Viral scenario", config: blankConfig() },
];

describe("TopBar + Event button", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("renders + Event button", () => {
    render(
      <TopBar
        presets={mockPresets}
        selectedName={null}
        onSelectPreset={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /\+ Event/i }),
    ).toBeInTheDocument();
  });

  it("clicking + Event adds an anomaly to the store", () => {
    render(
      <TopBar
        presets={mockPresets}
        selectedName={null}
        onSelectPreset={() => {}}
      />,
    );
    expect(useSeederStore.getState().config.anomalies?.length ?? 0).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: /\+ Event/i }));
    expect(useSeederStore.getState().config.anomalies?.length).toBe(1);
  });
});

describe("TopBar mode badge", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
  });

  it("shows goal badge when in goal mode (no starting_rate)", () => {
    useSeederStore.getState().loadPreset({
      ...blankConfig(),
      scale_config: { total_users: 5000 },
    });
    render(
      <TopBar
        presets={mockPresets}
        selectedName={null}
        onSelectPreset={vi.fn()}
      />,
    );
    expect(screen.getByText(/🎯 Goal:/)).toBeInTheDocument();
    expect(screen.getByText(/5000 users/)).toBeInTheDocument();
  });

  it("shows rate badge when in rate mode (starting_rate set)", () => {
    useSeederStore.getState().loadPreset({
      ...blankConfig(),
      scale_config: { starting_rate: 200 },
    });
    render(
      <TopBar
        presets={mockPresets}
        selectedName={null}
        onSelectPreset={vi.fn()}
      />,
    );
    expect(screen.getByText(/📈 Rate:/)).toBeInTheDocument();
    expect(screen.getByText(/200 users\/day/)).toBeInTheDocument();
  });
});
