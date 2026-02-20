import {
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Receipt,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  checklist,
  MODULE_TABLE_CONFIGS,
  type MockProperty,
  mockProperties,
  mockReservations,
} from "./hero-data";

/* ================================================================== */
/*  Animation variant (shared)                                         */
/* ================================================================== */

export const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

/* ================================================================== */
/*  Tier 1 — Home (Dashboard)                                         */
/* ================================================================== */

export function HomeContent() {
  return (
    <div className="h-full">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="mb-1 font-bold text-2xl tracking-tight">
            Good morning, Christopher
          </h2>
          <p className="text-muted-foreground text-sm">
            Here is your portfolio pulse and what needs attention next.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="w-48 rounded-lg border border-border bg-[#fafafa] p-3 shadow-sm dark:bg-[#111]">
            <div className="mb-1 flex items-center gap-2 font-medium text-sm">
              <Receipt className="h-3 w-3 opacity-60" /> Payout statements
            </div>
            <div className="text-[11px] text-muted-foreground">
              View monthly payout statements.
            </div>
          </div>
          <div className="w-48 rounded-lg border border-border bg-[#fafafa] p-3 shadow-sm dark:bg-[#111]">
            <div className="mb-1 flex items-center gap-2 font-medium text-sm">
              <BarChart3 className="h-3 w-3 opacity-60" /> Collections
            </div>
            <div className="text-[11px] text-muted-foreground">
              Monitor paid, pending, and overdue.
            </div>
          </div>
        </div>
      </div>

      {/* Getting started */}
      <div className="relative mb-8 rounded-xl border border-border bg-white p-6 shadow-sm dark:bg-black">
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          type="button"
        >
          ✕
        </button>
        <h3 className="mb-1 font-semibold text-lg">Getting started</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          Complete these steps to unlock your full operations workflow.
        </p>

        <div className="mb-6 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[30%] bg-foreground" />
          </div>
          <div className="font-medium text-muted-foreground text-xs">3/10</div>
        </div>

        <div className="space-y-0.5">
          {checklist.map((item) => (
            <div
              className="group flex items-center justify-between border-border/50 border-b py-2 last:border-0"
              key={item.name}
            >
              <div
                className={`flex items-center gap-3 text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-red-500/50 bg-red-50 text-red-500 dark:bg-red-500/10" : "border-border"}`}
                >
                  {item.done && <span className="text-[10px]">✓</span>}
                </div>
                {item.name}
              </div>
              {item.action && (
                <div className="cursor-pointer text-muted-foreground text-xs transition-colors group-hover:text-foreground">
                  {item.action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats tabs */}
      <div>
        <div className="mb-6 flex gap-6 border-border border-b">
          <div className="border-red-500 border-b-2 pb-2 font-semibold text-sm">
            Overview
          </div>
          <div className="cursor-pointer pb-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground">
            Financials
          </div>
          <div className="cursor-pointer pb-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground">
            Operations
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "OCCUPANCY RATE", value: "78.5%" },
            { label: "MONTHLY REVENUE", value: "₲ 85M" },
            { label: "COLLECTION RATE", value: "94.2%" },
            { label: "PIPELINE", value: "₲ 12M" },
          ].map((stat) => (
            <div
              className="shimmer-card relative overflow-hidden rounded-xl border border-border bg-white p-5 shadow-sm dark:bg-[#111]"
              key={stat.label}
            >
              <div className="relative z-10 mb-3 flex items-center gap-2 font-semibold text-muted-foreground text-xs tracking-wide">
                <BarChart3 className="h-3 w-3" />
                {stat.label}
              </div>
              <div className="relative z-10 font-bold font-serif text-3xl">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 1 — Properties                                                */
/* ================================================================== */

function PropertyMockCard({ p }: { p: MockProperty }) {
  const healthDot =
    p.health === "critical"
      ? "bg-red-500 animate-pulse"
      : p.health === "watch"
        ? "bg-amber-500"
        : "bg-green-500";

  const occupancyColor =
    p.occupancy < 50
      ? "text-red-500"
      : p.occupancy < 80
        ? "text-amber-500"
        : "text-green-600 dark:text-green-400";

  return (
    <div className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-white transition-all hover:border-black/20 hover:shadow-md dark:bg-[#111] dark:hover:border-white/20">
      {/* Cover area */}
      <div className="relative h-28 bg-muted/30">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] dark:opacity-[0.12]">
          <Building2 className="h-16 w-16" />
        </div>

        {/* Status + health dot */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          <span className="rounded border border-border/30 bg-background/60 px-1.5 py-0.5 font-semibold text-[9px] uppercase tracking-widest backdrop-blur-md">
            {p.status}
          </span>
          <span className={`h-2 w-2 rounded-full shadow-sm ${healthDot}`} />
        </div>

        {/* Code badge */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="rounded-md border border-border/30 bg-background/60 px-2 py-0.5 font-semibold text-[9px] tracking-wide backdrop-blur-md">
            {p.code}
          </span>
        </div>

        {/* Unit count */}
        <div className="absolute right-2.5 bottom-2.5 z-10">
          <span className="rounded-md border border-border/30 bg-background/60 px-1.5 py-0.5 font-medium text-[9px] backdrop-blur-md">
            {p.unitCount} units
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h4 className="truncate font-medium text-sm tracking-tight transition-colors group-hover:text-red-500">
          {p.name}
        </h4>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{p.address}</span>
        </div>

        {/* Stats row */}
        <div className="mt-3 grid grid-cols-3 gap-3 border-border/40 border-t pt-3">
          <div>
            <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest">
              Occ.
            </span>
            <div
              className={`font-medium text-sm tabular-nums ${occupancyColor}`}
            >
              {p.occupancy}%
            </div>
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest">
              Revenue
            </span>
            <div className="font-medium text-sm tabular-nums">{p.revenue}</div>
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest">
              Tasks
            </span>
            <div
              className={`font-medium text-sm tabular-nums ${p.tasks > 0 ? "text-amber-500" : "text-muted-foreground"}`}
            >
              {p.tasks}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-border/30 border-t px-3.5 py-2">
        <span className="font-medium text-[11px] text-foreground/70 transition-colors group-hover:text-foreground">
          View Details →
        </span>
      </div>
    </div>
  );
}

export function PropertiesContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-bold text-2xl tracking-tight">Properties</h2>
        <button
          className="rounded bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm"
          type="button"
        >
          Add Property
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {mockProperties.map((p) => (
          <PropertyMockCard key={p.code} p={p} />
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 1 — Reservations                                              */
/* ================================================================== */

export function ReservationsContent() {
  return (
    <div className="h-full">
      <div className="mb-6 font-bold text-2xl tracking-tight">Reservations</div>
      <div className="rounded-xl border border-border bg-white shadow-sm dark:bg-black">
        <div className="grid grid-cols-6 border-border border-b p-4 font-semibold text-muted-foreground text-xs uppercase">
          <div>Status</div>
          <div>Check-in</div>
          <div>Check-out</div>
          <div>Guest</div>
          <div>Unit</div>
          <div>Source</div>
        </div>
        {mockReservations.map((r) => (
          <div
            className="grid grid-cols-6 border-border border-b p-4 text-sm last:border-0"
            key={r.guest}
          >
            <div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${r.statusColor}`}
              >
                {r.status}
              </span>
            </div>
            <div className="text-muted-foreground">{r.checkIn}</div>
            <div className="text-muted-foreground">{r.checkOut}</div>
            <div className="font-medium">{r.guest}</div>
            <div className="truncate text-muted-foreground text-xs">
              {r.unit}
            </div>
            <div className="text-muted-foreground">{r.source}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 1 — Inbox                                                     */
/* ================================================================== */

const inboxMessages = [
  {
    guest: "Lucía Fernández",
    source: "Airbnb",
    time: "1hr ago",
    msg: "Hi, what time is check-in tomorrow?",
  },
  {
    guest: "James Carter",
    source: "Booking.com",
    time: "3hr ago",
    msg: "Is early check-in possible for my reservation?",
  },
  {
    guest: "Ana Giménez",
    source: "Direct",
    time: "1d ago",
    msg: "I need an extra set of towels please.",
  },
];

export function InboxContent() {
  return (
    <div className="flex h-full gap-4">
      <div className="w-1/3 flex-shrink-0 space-y-2 border-border border-r pr-4">
        <div className="mb-4 font-semibold text-lg">Messages</div>
        {inboxMessages.map((m, i) => (
          <div
            className={`cursor-pointer rounded-lg p-3 transition-colors ${i === 0 ? "bg-muted" : "hover:bg-muted/50"}`}
            key={m.guest}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="font-medium text-sm">{m.guest}</div>
              <div className="text-[10px] text-muted-foreground">{m.time}</div>
            </div>
            <div className="mb-1 text-[10px] text-muted-foreground">
              {m.source}
            </div>
            <div className="truncate text-muted-foreground text-xs">
              {m.msg}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="text-sm">Select a message to read</div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 1 — Chat (AI Agent)                                           */
/* ================================================================== */

const chatAgents = [
  {
    name: "Property Assistant",
    icon: Building2,
    desc: "Answers tenant & guest questions",
  },
  {
    name: "Revenue Optimizer",
    icon: BarChart3,
    desc: "Pricing and occupancy insights",
  },
  {
    name: "Maintenance Bot",
    icon: CheckCircle2,
    desc: "Triage and assign work orders",
  },
];

const chatHistory = [
  { role: "user" as const, text: "What's the occupancy forecast for March?" },
  {
    role: "assistant" as const,
    text: "Based on current bookings, March occupancy is projected at 84% across your portfolio. Marina Bay Suites leads at 92%.",
  },
  { role: "user" as const, text: "Any pricing recommendations?" },
  {
    role: "assistant" as const,
    text: "I'd suggest increasing weekend rates by 15% for Marina Bay — demand is high and you're underpriced vs. comparable listings.",
  },
];

export function ChatContent() {
  return (
    <div className="flex h-full gap-4">
      <div className="w-1/3 flex-shrink-0 space-y-2 border-border border-r pr-4">
        <div className="mb-4 font-semibold text-lg">AI Agents</div>
        {chatAgents.map((a, i) => (
          <div
            className={`cursor-pointer rounded-lg p-3 transition-colors ${i === 0 ? "bg-muted" : "hover:bg-muted/50"}`}
            key={a.name}
          >
            <div className="mb-1 flex items-center gap-2 font-medium text-sm">
              <a.icon className="h-4 w-4 text-red-500" />
              {a.name}
            </div>
            <div className="text-muted-foreground text-xs">{a.desc}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex items-center gap-2 border-border border-b pb-3">
          <Sparkles className="h-4 w-4 text-red-500" />
          <span className="font-semibold text-sm">Property Assistant</span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {chatHistory.map((msg) => (
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              key={msg.text}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                  msg.role === "user"
                    ? "bg-foreground text-background"
                    : "border border-border bg-muted/50"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">
            Ask anything about your properties…
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 3 — Calendar (week view)                                      */
/* ================================================================== */

const calendarUnits = ["Suite A", "Suite B", "Apt 3B", "Unit 1"];
const calendarDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const calendarBlocks: Record<
  string,
  { start: number; span: number; guest: string; color: string }
> = {
  "Suite A": {
    start: 0,
    span: 5,
    guest: "L. Fernández",
    color:
      "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  },
  "Suite B": {
    start: 2,
    span: 3,
    guest: "J. Carter",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  },
  "Apt 3B": {
    start: 4,
    span: 3,
    guest: "A. Giménez",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  },
  "Unit 1": {
    start: 1,
    span: 4,
    guest: "M. Villalba",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  },
};

export function CalendarContent() {
  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-bold text-2xl tracking-tight">Calendar</h2>
        <span className="text-muted-foreground text-sm">Feb 17 – 23, 2026</span>
      </div>
      <div className="rounded-xl border border-border bg-white shadow-sm dark:bg-black">
        {/* Header */}
        <div className="grid grid-cols-[100px_repeat(7,1fr)] border-border border-b">
          <div className="border-border border-r p-2 font-semibold text-muted-foreground text-xs">
            Unit
          </div>
          {calendarDays.map((d) => (
            <div
              className="border-border border-r p-2 text-center font-semibold text-muted-foreground text-xs last:border-r-0"
              key={d}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Rows */}
        {calendarUnits.map((unit) => {
          const block = calendarBlocks[unit];
          return (
            <div
              className="grid grid-cols-[100px_repeat(7,1fr)] border-border border-b last:border-b-0"
              key={unit}
            >
              <div className="flex items-center border-border border-r p-2 font-medium text-xs">
                {unit}
              </div>
              {calendarDays.map((day, di) => (
                <div
                  className="relative border-border border-r p-1 last:border-r-0"
                  key={day}
                  style={{ minHeight: 36 }}
                >
                  {block && di === block.start && (
                    <div
                      className={`absolute inset-y-1 left-1 z-10 flex items-center rounded-md px-2 font-medium text-[10px] ${block.color}`}
                      style={{ width: `calc(${block.span * 100}% - 4px)` }}
                    >
                      {block.guest}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 3 — Operations (Kanban)                                       */
/* ================================================================== */

const kanbanColumns = [
  {
    title: "To Do",
    color: "border-t-amber-500",
    tasks: [
      {
        title: "Deep clean Suite B",
        tag: "Cleaning",
        tagColor:
          "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      },
      {
        title: "Replace AC filter — Apt 3B",
        tag: "Maintenance",
        tagColor: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      },
    ],
  },
  {
    title: "In Progress",
    color: "border-t-blue-500",
    tasks: [
      {
        title: "Restock linens — Suite A",
        tag: "Inventory",
        tagColor:
          "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
      },
    ],
  },
  {
    title: "Done",
    color: "border-t-green-500",
    tasks: [
      {
        title: "Guest welcome pack",
        tag: "Onboarding",
        tagColor:
          "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
      },
      {
        title: "Fix leaky faucet Unit 1",
        tag: "Maintenance",
        tagColor: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      },
    ],
  },
];

export function OperationsContent() {
  return (
    <div className="h-full">
      <div className="mb-6 font-bold text-2xl tracking-tight">Operations</div>
      <div className="grid grid-cols-3 gap-4">
        {kanbanColumns.map((col) => (
          <div
            className={`rounded-xl border border-border border-t-2 ${col.color} bg-muted/20 p-3`}
            key={col.title}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-sm">{col.title}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[10px] text-muted-foreground">
                {col.tasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {col.tasks.map((task) => (
                <div
                  className="cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm transition-all hover:shadow-md dark:bg-[#111]"
                  key={task.title}
                >
                  <div className="mb-2 font-medium text-xs">{task.title}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${task.tagColor}`}
                  >
                    {task.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 3 — Automations (Rule list with toggles)                      */
/* ================================================================== */

const automationRules = [
  {
    name: "Auto-assign cleaning after checkout",
    trigger: "Reservation checkout",
    enabled: true,
  },
  {
    name: "Send welcome message 24h before check-in",
    trigger: "Scheduled",
    enabled: true,
  },
  {
    name: "Notify owner on new booking",
    trigger: "New reservation",
    enabled: false,
  },
  {
    name: "Price increase on high-demand weekends",
    trigger: "Calendar event",
    enabled: true,
  },
  {
    name: "Maintenance escalation after 48h",
    trigger: "Task overdue",
    enabled: false,
  },
];

export function AutomationsContent() {
  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-bold text-2xl tracking-tight">Automations</h2>
        <button
          className="rounded bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm"
          type="button"
        >
          New Rule
        </button>
      </div>
      <div className="rounded-xl border border-border bg-white shadow-sm dark:bg-black">
        {automationRules.map((rule, _i) => (
          <div
            className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
            key={rule.name}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${rule.enabled ? "bg-green-50 dark:bg-green-500/10" : "bg-muted"}`}
              >
                {rule.enabled ? (
                  <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="font-medium text-sm">{rule.name}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="h-3 w-3" />
                  {rule.trigger}
                </div>
              </div>
            </div>
            <div
              className={`rounded-full px-2.5 py-0.5 font-medium text-[10px] ${
                rule.enabled
                  ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {rule.enabled ? "Active" : "Inactive"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tier 2 — Generic table renderer                                    */
/* ================================================================== */

export function MockTableContent({ tab }: { tab: string }) {
  const config = MODULE_TABLE_CONFIGS[tab];
  if (!config) return null;

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-bold text-2xl tracking-tight">{tab}</h2>
      </div>
      <div className="rounded-xl border border-border bg-white shadow-sm dark:bg-black">
        <div
          className="grid border-border border-b p-4 font-semibold text-muted-foreground text-xs uppercase"
          style={{
            gridTemplateColumns: `repeat(${config.columns.length}, minmax(0, 1fr))`,
          }}
        >
          {config.columns.map((col) => (
            <div key={col}>{col}</div>
          ))}
        </div>
        {config.rows.map((row) => (
          <div
            className="grid border-border border-b p-4 text-sm last:border-0"
            key={row[0] || row.join("-")}
            style={{
              gridTemplateColumns: `repeat(${config.columns.length}, minmax(0, 1fr))`,
            }}
          >
            {row.map((cell, ci) => {
              const uniqueKey = `${cell}-${ci}`;
              // First column bold
              if (ci === 0)
                return (
                  <div className="font-medium" key={uniqueKey}>
                    {cell}
                  </div>
                );
              // Status-like cells
              if (
                cell === "Occupied" ||
                cell === "Published" ||
                cell === "Confirmed" ||
                cell === "Ready" ||
                cell === "Paid" ||
                cell === "Active"
              ) {
                return (
                  <div key={uniqueKey}>
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-600 text-xs dark:bg-green-500/10 dark:text-green-400">
                      {cell}
                    </span>
                  </div>
                );
              }
              if (
                cell === "Vacant" ||
                cell === "Draft" ||
                cell === "Pending" ||
                cell === "Inactive"
              ) {
                return (
                  <div key={uniqueKey}>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600 text-xs dark:bg-amber-500/10 dark:text-amber-400">
                      {cell}
                    </span>
                  </div>
                );
              }
              if (cell === "Sent") {
                return (
                  <div key={uniqueKey}>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 text-xs dark:bg-blue-500/10 dark:text-blue-400">
                      {cell}
                    </span>
                  </div>
                );
              }
              return (
                <div className="text-muted-foreground" key={uniqueKey}>
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Content registry                                                   */
/* ================================================================== */

const TIER_1: Record<string, () => React.JSX.Element> = {
  Home: () => <HomeContent />,
  Properties: () => <PropertiesContent />,
  Reservations: () => <ReservationsContent />,
  Inbox: () => <InboxContent />,
  Chat: () => <ChatContent />,
};

const TIER_3: Record<string, () => React.JSX.Element> = {
  Calendar: () => <CalendarContent />,
  Operations: () => <OperationsContent />,
  Automations: () => <AutomationsContent />,
};

const TIER_2_MODULES = new Set(Object.keys(MODULE_TABLE_CONFIGS));

export function getModuleContent(tab: string): React.JSX.Element {
  if (TIER_1[tab]) return TIER_1[tab]();
  if (TIER_3[tab]) return TIER_3[tab]();
  if (TIER_2_MODULES.has(tab)) return <MockTableContent tab={tab} />;
  // Income uses the same income/expenses table pattern
  if (tab === "Income") return <MockTableContent tab="Expenses" />;
  if (tab === "Channels") return <MockTableContent tab="Listings" />;
  return <MockTableContent tab="Units" />;
}
