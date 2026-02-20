import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  completeTask,
  createTaskItem,
  getTask,
  listTaskItems,
  updateTaskItem,
  type Task,
  type TaskItem,
} from "@/lib/api";

type TaskIdParams = {
  id?: string | string[];
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<TaskIdParams>();
  const taskId = Array.isArray(id) ? id[0] : id;

  const [task, setTask] = useState<Task | null>(null);
  const [items, setItems] = useState<TaskItem[]>([]);
  const [completionNotes, setCompletionNotes] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTaskBundle = useCallback(
    async (isRefresh: boolean) => {
      if (!taskId) {
        setError("Task ID is missing.");
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [taskPayload, itemRows] = await Promise.all([
          getTask(taskId),
          listTaskItems(taskId),
        ]);
        setTask(taskPayload);
        setItems(itemRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load task details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [taskId]
  );

  useEffect(() => {
    loadTaskBundle(false);
  }, [loadTaskBundle]);

  const completionBlocked = useMemo(() => {
    if (!task) return true;
    const normalizedStatus = normalize(task.status);
    if (normalizedStatus === "done" || normalizedStatus === "cancelled") {
      return true;
    }

    return items.some((item) => item.is_required && !item.is_completed);
  }, [items, task]);

  const requiredRemaining = useMemo(
    () => items.filter((item) => item.is_required && !item.is_completed).length,
    [items]
  );

  const handleToggleItem = async (item: TaskItem) => {
    if (!taskId || togglingItemId) return;

    setTogglingItemId(item.id);
    setError(null);
    try {
      const updated = await updateTaskItem(taskId, item.id, {
        is_completed: !item.is_completed,
      });

      setItems((current) =>
        current
          .map((row) => (row.id === updated.id ? updated : row))
          .sort((a, b) => {
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
            return a.label.localeCompare(b.label);
          })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update checklist item");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleAddItem = async () => {
    if (!taskId || addingItem) return;

    const label = newItemLabel.trim();
    if (!label) {
      setError("Checklist item label is required.");
      return;
    }

    setAddingItem(true);
    setError(null);

    try {
      const created = await createTaskItem(taskId, {
        label,
        is_required: true,
      });

      setItems((current) =>
        [...current, created].sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.label.localeCompare(b.label);
        })
      );
      setNewItemLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add checklist item");
    } finally {
      setAddingItem(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!taskId || completionBlocked || completing) return;

    setCompleting(true);
    setError(null);
    try {
      const updated = await completeTask(taskId, completionNotes);
      setTask(updated);
      setCompletionNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete task");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
        </View>
      ) : null}

      {!loading && task ? (
        <View style={styles.stack}>
          <View style={styles.card}>
            <Text style={styles.title}>{task.title || "Untitled task"}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{labelForStatus(task.status)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.label}>Priority</Text>
              <Text style={styles.value}>{task.priority || "-"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{task.type || "-"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.label}>Due</Text>
              <Text style={styles.value}>{formatDateTime(task.due_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.label}>Completed</Text>
              <Text style={styles.value}>{formatDateTime(task.completed_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.label}>Task ID</Text>
              <Text style={styles.value}>{task.id}</Text>
            </View>

            {task.description ? (
              <View style={styles.descriptionWrap}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.subtitle}>Checklist</Text>
              <Text style={styles.smallInfo}>
                {items.filter((item) => item.is_completed).length}/{items.length} done
              </Text>
            </View>

            {requiredRemaining > 0 ? (
              <Text style={styles.warning}>
                Complete required checklist items first ({requiredRemaining} remaining).
              </Text>
            ) : null}

            {items.length ? (
              <View style={styles.itemsWrap}>
                {items.map((item) => {
                  const isBusy = togglingItemId === item.id;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleToggleItem(item)}
                      style={({ pressed }) => [
                        styles.itemRow,
                        pressed && !isBusy ? styles.itemRowPressed : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          item.is_completed ? styles.checkboxChecked : null,
                        ]}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : item.is_completed ? (
                          <Text style={styles.checkboxMark}>✓</Text>
                        ) : null}
                      </View>

                      <View style={styles.itemTextWrap}>
                        <Text
                          style={[
                            styles.itemLabel,
                            item.is_completed ? styles.itemLabelDone : null,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {item.is_required ? "Required" : "Optional"} • {item.is_completed ? "Done" : "Open"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>No checklist items yet.</Text>
            )}

            <View style={styles.addRow}>
              <TextInput
                editable={!addingItem}
                onChangeText={setNewItemLabel}
                placeholder="Add checklist item"
                placeholderTextColor="#8a9498"
                style={styles.addInput}
                value={newItemLabel}
              />
              <Pressable
                disabled={addingItem || !newItemLabel.trim()}
                onPress={handleAddItem}
                style={({ pressed }) => [
                  styles.addButton,
                  addingItem || !newItemLabel.trim() ? styles.buttonDisabled : null,
                  pressed && !addingItem ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.addButtonText}>{addingItem ? "Adding..." : "Add"}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.subtitle}>Complete Task</Text>
            <TextInput
              editable={!completing && !completionBlocked}
              multiline
              onChangeText={setCompletionNotes}
              placeholder="Optional completion notes"
              placeholderTextColor="#8a9498"
              style={styles.notesInput}
              value={completionNotes}
            />

            <Pressable
              accessibilityRole="button"
              disabled={completionBlocked || completing}
              onPress={handleCompleteTask}
              style={({ pressed }) => [
                styles.button,
                completionBlocked || completing ? styles.buttonDisabled : null,
                pressed && !completionBlocked ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.buttonText}>
                {completing ? "Completing..." : completionBlocked ? "Checklist incomplete" : "Mark complete"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading || refreshing || completing}
              onPress={() => loadTaskBundle(true)}
              style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
            >
              <Text style={styles.secondaryButtonText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function labelForStatus(status: string) {
  const normalized = normalize(status);
  if (normalized === "todo") return "To do";
  if (normalized === "in_progress") return "In progress";
  if (normalized === "done") return "Done";
  if (normalized === "cancelled") return "Cancelled";
  return status || "Unknown";
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f7f7f5",
    padding: 16,
  },
  center: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  stack: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e6e6",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f3136",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f3136",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  smallInfo: {
    color: "#5b6f76",
    fontSize: 12,
  },
  warning: {
    fontSize: 13,
    color: "#b45309",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: "#4b5f66",
    fontWeight: "600",
  },
  value: {
    flexShrink: 1,
    textAlign: "right",
    color: "#1f3136",
    fontSize: 13,
  },
  descriptionWrap: {
    gap: 4,
  },
  description: {
    color: "#334045",
    fontSize: 14,
    lineHeight: 20,
  },
  itemsWrap: {
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e6e6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#fafcfc",
  },
  itemRowPressed: {
    opacity: 0.88,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#b7c4c7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkboxChecked: {
    backgroundColor: "#1b6f65",
    borderColor: "#1b6f65",
  },
  checkboxMark: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 14,
    color: "#1f3136",
    fontWeight: "600",
  },
  itemLabelDone: {
    textDecorationLine: "line-through",
    color: "#6d8086",
  },
  itemMeta: {
    fontSize: 12,
    color: "#637980",
  },
  emptyText: {
    fontSize: 14,
    color: "#637980",
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  addInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#d6dbdc",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1e2b2f",
    backgroundColor: "#fbfcfc",
  },
  addButton: {
    borderRadius: 10,
    backgroundColor: "#1b6f65",
    minHeight: 40,
    minWidth: 76,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  notesInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: "#d6dbdc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e2b2f",
    textAlignVertical: "top",
    backgroundColor: "#fbfcfc",
  },
  button: {
    borderRadius: 10,
    backgroundColor: "#1b6f65",
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cad3d5",
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#223238",
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    color: "#b91c1c",
    lineHeight: 18,
  },
});
