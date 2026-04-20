import { Segmented } from "@stratif-io/web";
import { useSeederStore } from "@/stores/seederStore";
import { AXIS_SPEC } from "@/lib/twin";

export function AxesSection() {
  const axes = useSeederStore((s) => s.config.axes);
  const setAxis = useSeederStore((s) => s.setAxis);

  return (
    <section aria-labelledby="axes-heading" className="space-y-3">
      <h2 id="axes-heading" className="text-sm font-semibold">
        Axes
      </h2>
      {Object.values(AXIS_SPEC).map((axis) => {
        const current = axes[axis.id] ?? axis.default;
        return (
          <div
            key={axis.id}
            className="grid grid-cols-[70px_1fr] gap-3 items-center"
          >
            <div className="text-xs font-medium">{axis.label}</div>
            <Segmented
              value={current}
              defaultValue={axis.default}
              onChange={(v) => setAxis(axis.id, v)}
              options={axis.values.map((v) => ({
                value: v.value,
                label: v.label,
                tooltip: v.description || undefined,
              }))}
            />
          </div>
        );
      })}
    </section>
  );
}
