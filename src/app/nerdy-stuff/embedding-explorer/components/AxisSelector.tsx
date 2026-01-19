"use client";

import { type SemanticAxis, type AxisAssignment } from "../types";

interface AxisSelectorProps {
  axes: SemanticAxis[];
  activeAxes: AxisAssignment;
  onSetActiveAxes: (assignment: Partial<AxisAssignment>) => void;
  disabled?: boolean;
}

export default function AxisSelector({
  axes,
  activeAxes,
  onSetActiveAxes,
  disabled = false,
}: AxisSelectorProps) {
  // Only show computed axes
  const computedAxes = axes.filter((a) => a.axisVector !== null);

  const dimensions = [
    { key: "x" as const, label: "X", color: "text-red-500" },
    { key: "y" as const, label: "Y", color: "text-green-500" },
    { key: "z" as const, label: "Z", color: "text-blue-500" },
  ];

  if (axes.length === 0) {
    return (
      <div className="text-xs text-neutral-500">
        Add semantic axes above to assign them to X/Y/Z.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        Assign to Axes
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {dimensions.map(({ key, label, color }) => (
          <div key={key} className="space-y-1">
            <label className={`text-xs font-medium ${color}`}>{label}</label>
            <select
              value={activeAxes[key] ?? ""}
              onChange={(e) =>
                onSetActiveAxes({ [key]: e.target.value || null })
              }
              disabled={disabled || computedAxes.length === 0}
              className="w-full px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded bg-transparent disabled:opacity-50"
            >
              <option value="">None</option>
              {computedAxes.map((axis) => (
                <option key={axis.id} value={axis.id}>
                  {axis.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {computedAxes.length > 0 && !activeAxes.x && !activeAxes.y && !activeAxes.z && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Assign at least one axis to see the projection.
        </p>
      )}

      {computedAxes.length === 0 && axes.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
          Waiting for axes to compute...
        </p>
      )}
    </div>
  );
}
