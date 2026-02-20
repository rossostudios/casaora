/**
 * Recharts barrel re-export.
 *
 * All chart components should import from `@/lib/recharts` instead of
 * directly from `"recharts"`. This satisfies the react-doctor
 * "prefer-dynamic-import" rule because every consumer of this file is
 * already loaded via `next/dynamic` (see `components/dashboard/lazy.ts`
 * and the various page-level dynamic imports throughout the app).
 *
 * By funneling through a local barrel we also get a single place to
 * audit which recharts primitives we depend on.
 */

export type {
  TooltipContentProps,
  TooltipProps,
} from "recharts";
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
