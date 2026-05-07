'use client';

/**
 * WeeklyPlanSkeleton - Loading skeleton for weekly plan view
 * Placeholder for Phase 3 implementation (calendar view)
 */

export default function WeeklyPlanSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
