'use client';

import { useMemo, useState } from "react";

export type FilterOption = {
  label: string;
  count: number;
};

export type FilterSection = {
  id: string;
  label: string;
  options: FilterOption[];
  showMoreCap?: number;
};

export type SizeConfig = {
  min: number;
  max: number;
  defaultMin: number;
  defaultMax: number;
};

type FilterPanelProps = {
  sections: FilterSection[];
  selectedFilters: Record<string, string[]>;
  sizeRange: { min: number; max: number };
  sizeConfig: SizeConfig;
  chips: string[];
  appliedCount: number;
  onToggleFilter: (sectionId: string, option: string) => void;
  onSizeRangeChange: (key: "min" | "max", value: number) => void;
  onClearAll: () => void;
  onApply: () => void;
};

const defaultCollapsedIds = new Set(["brand", "color-tones"]);

export function FilterPanel({
  sections,
  selectedFilters,
  sizeRange,
  sizeConfig,
  chips,
  appliedCount,
  onToggleFilter,
  onSizeRangeChange,
  onClearAll,
  onApply,
}: FilterPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    sections.reduce((acc, section) => {
      acc[section.id] = defaultCollapsedIds.has(section.id);
      return acc;
    }, {} as Record<string, boolean>),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const chipList = useMemo(() => chips, [chips]);

  return (
    <div className="w-full lg:flex lg:w-80">
      <div className="flex max-h-[80vh] w-full flex-col border border-slate-200 bg-white shadow-sm lg:sticky lg:top-10">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-slate-500">
              Filters ({appliedCount})
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {chipList.length ? (
                chipList.map((chip) => (
                  <span key={chip} className="border border-slate-300 px-3 py-1 uppercase tracking-[0.2em]">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="text-[11px] tracking-[0.2em] text-slate-400">No filters applied</span>
              )}
            </div>
          </div>
          <button
            className="text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-600"
            onClick={onClearAll}
          >
            Clear All
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="border-b border-slate-100 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Plank size (width)
              </p>
              <span className="text-[11px] text-slate-500">
                {sizeConfig.min}&quot;-{sizeConfig.max}&quot;
              </span>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between text-[11px] uppercase tracking-[0.2em]">
                <span>Min {sizeRange.min}&quot;</span>
                <span>Max {sizeRange.max}&quot;</span>
              </div>
              <input
                type="range"
                min={sizeConfig.min}
                max={sizeConfig.max}
                value={sizeRange.min}
                onChange={(event) => onSizeRangeChange("min", Number(event.target.value))}
                className="w-full accent-amber-600"
              />
              <input
                type="range"
                min={sizeConfig.min}
                max={sizeConfig.max}
                value={sizeRange.max}
                onChange={(event) => onSizeRangeChange("max", Number(event.target.value))}
                className="w-full accent-amber-600"
              />
              <p className="text-[11px] text-slate-500">
                Wider planks keep calm, gallery-worthy sightlines in open spaces.
              </p>
            </div>
          </div>

          {sections.map((section) => {
            const isCollapsed = collapsed[section.id];
            const isExpanded = expanded[section.id];
            const limit = section.showMoreCap;
            const hasShowMore = limit !== undefined && section.options.length > limit;
            const visibleOptions =
              hasShowMore && !isExpanded
                ? section.options.slice(0, limit)
                : section.options;
            return (
              <div key={section.id} className="border-b border-slate-100 py-4">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [section.id]: !prev[section.id],
                    }))
                  }
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {section.label}
                  </span>
                  <span className="text-sm text-slate-500">{isCollapsed ? "+" : "-"}</span>
                </button>
                {!isCollapsed && (
                  <div className="mt-3 space-y-2 text-xs">
                    {visibleOptions.map((option) => {
                      const checked = selectedFilters[section.id]?.includes(option.label);
                      return (
                        <label key={option.label} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                              checked={checked}
                              onChange={() => onToggleFilter(section.id, option.label)}
                            />
                            {option.label}
                          </span>
                          <span className="text-[11px] text-slate-400">({option.count})</span>
                        </label>
                      );
                    })}
                    {hasShowMore && (
                      <button
                        className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [section.id]: !prev[section.id],
                          }))
                        }
                      >
                        {isExpanded ? "Show Less" : "+ Show More"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              className="flex-1 border border-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em]"
              onClick={onClearAll}
            >
              Clear ({appliedCount})
            </button>
            <button
              className="flex-1 border border-slate-900 bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white"
              onClick={onApply}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
