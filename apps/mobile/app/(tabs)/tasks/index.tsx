import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  listTasks,
  resolveActiveOrgId,
  type Task,
  type TaskStatus,
} from "@/lib/api";

type TaskStatusFilter = "all" | TaskStatus;

const STATUS_FILTERS: Array<{ key: TaskStatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

export default function TasksListScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveOrg = async () => {
      try {
        const id = await resolveActiveOrgId();
        if (!cancelled) {
          setOrgId(id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to resolve organization");
          setLoading(false);
        }
      }
    };

    resolveOrg();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTasks = useCallback(
    async (isRefresh: boolean) => {
      if (!orgId) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const rows = await listTasks({
          orgId,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 200,
        });
        setTasks(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load tasks");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId, statusFilter]
  );

  useEffect(() => {
    if (!orgId) return;
    loadTasks(false);
  }, [orgId, statusFilter, loadTasks]);

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={() => loadTasks(true)} />,
    [loadTasks, refreshing]
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter.key === statusFilter;
          return (
            <Pressable
              key={filter.key}
              onPress={() => setStatusFilter(filter.key)}
              style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
            >
              <Text style={[styles.filterText, isActive ? styles.filterTextActive : null]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
        </View>
      ) : null}

      {!loading ? (
        <FlatList
          contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : styles.listContainer}
          data={tasks}
          keyExtractor={(item) => item.id}
          refreshControl={refreshControl}
          renderItem={({ item }) => <TaskRowCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptyBody}>Try changing status filters or create new tasks.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
        />
      ) : null}

      {!loading && error && tasks.length > 0 ? (
        <View style={styles.inlineError}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function TaskRowCard({ item }: { item: Task }) {
  return (
    <Link href={{ pathname: "/tasks/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}>
        <Text style={styles.title}>{item.title || "Untitled task"}</Text>

        <View style={styles.chipsRow}>
          <View style={[styles.chip, chipForStatus(item.status).bg]}>
            <Text style={styles.chipText}>{labelForStatus(item.status)}</Text>
          </View>
          <View style={[styles.chip, styles.chipNeutral]}>
            <Text style={styles.chipText}>{labelForPriority(item.priority)}</Text>
          </View>
          <View style={[styles.chip, styles.chipNeutral]}>
            <Text style={styles.chipText}>{labelForType(item.type)}</Text>
          </View>
        </View>

        <Text style={styles.meta}>Due: {formatDateTime(item.due_at)}</Text>
        <Text style={styles.meta}>Task ID: {item.id}</Text>
      </Pressable>
    </Link>
  );
}

function labelForStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "todo") return "To do";
  if (normalized === "in_progress") return "In progress";
  if (normalized === "done") return "Done";
  if (normalized === "cancelled") return "Cancelled";
  return status || "Unknown";
}

function labelForPriority(priority: string) {
  const normalized = priority.trim().toLowerCase();
  if (!normalized) return "Priority: n/a";
  return `Priority: ${normalized.replace("_", " ")}`;
}

function labelForType(type: string) {
  const normalized = type.trim().toLowerCase();
  if (!normalized) return "Type: n/a";
  return `Type: ${normalized.replace("_", " ")}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function chipForStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "done") return { bg: styles.chipSuccess };
  if (normalized === "in_progress") return { bg: styles.chipWarning };
  if (normalized === "cancelled") return { bg: styles.chipDanger };
  return { bg: styles.chipInfo };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f5",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#d8dede",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  filterChipActive: {
    backgroundColor: "#1b6f65",
    borderColor: "#1b6f65",
  },
  filterText: {
    color: "#2c3d42",
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    flexGrow: 1,
    padding: 16,
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e6e6",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f3136",
  },
  emptyBody: {
    fontSize: 14,
    color: "#4c5f65",
  },
  inlineError: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  error: {
    fontSize: 13,
    color: "#b91c1c",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e6e6",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.9,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f3136",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1b2c30",
  },
  chipNeutral: {
    backgroundColor: "#ebefef",
  },
  chipSuccess: {
    backgroundColor: "#d8f2e2",
  },
  chipWarning: {
    backgroundColor: "#fce7c5",
  },
  chipDanger: {
    backgroundColor: "#f8d4d4",
  },
  chipInfo: {
    backgroundColor: "#dbe8f6",
  },
  meta: {
    fontSize: 12,
    color: "#587078",
  },
});
