import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Link } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useAuth } from "@/lib/auth";
import {
  listMessageThreads,
  listReservations,
  listTasks,
  resolveActiveOrgId,
  type Reservation,
  type Task,
  type MessageThread,
} from "@/lib/api";

type DashboardStats = {
  arrivals: number;
  departures: number;
  pendingTasks: number;
  unreadMessages: number;
};

export default function DashboardScreen() {
  const { session, configError } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setLoading(false);
      return;
    }

    resolveActiveOrgId()
      .then((id) => {
        if (!cancelled) setOrgId(id);
      })
      .catch((err) => {
        if (!cancelled) setError("Could not resolve organization.");
      });
    return () => { cancelled = true; };
  }, [session]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!orgId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().slice(0, 10);

      const [res, tasks, threads] = await Promise.all([
        listReservations({ orgId, from: today, to: today, limit: 100 }),
        listTasks({ orgId, status: "todo", limit: 50 }),
        listMessageThreads({ orgId, limit: 50 }),
      ]);

      const arrivals = res.filter((r) => r.check_in?.slice(0, 10) === today).length;
      const departures = res.filter((r) => r.check_out?.slice(0, 10) === today).length;
      const unreadMessages = threads.filter((t) => (t.unread_count ?? 0) > 0).length;

      setStats({
        arrivals,
        departures,
        pendingTasks: tasks.length,
        unreadMessages,
      });
    } catch (err) {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Sign in to view dashboard.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back to Casaora.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {configError ? <Text style={styles.error}>{configError}</Text> : null}

      {loading && !refreshing && !stats ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      ) : stats ? (
        <View style={styles.grid}>
          <View style={styles.row}>
            <Link href={"/(tabs)/calendar" as any} asChild>
              <Pressable style={[styles.card, styles.cardArrival]}>
                <View style={styles.cardHeader}>
                  <FontAwesome name="sign-in" size={20} color="#1f3136" />
                </View>
                <Text style={styles.cardValue}>{stats.arrivals}</Text>
                <Text style={styles.cardLabel}>Arrivals Today</Text>
              </Pressable>
            </Link>

            <Link href={"/(tabs)/calendar" as any} asChild>
              <Pressable style={[styles.card, styles.cardDeparture]}>
                <View style={styles.cardHeader}>
                  <FontAwesome name="sign-out" size={20} color="#1f3136" />
                </View>
                <Text style={styles.cardValue}>{stats.departures}</Text>
                <Text style={styles.cardLabel}>Departures Today</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.row}>
            <Link href="/(tabs)/messages" asChild>
              <Pressable style={[styles.card, styles.cardMessage]}>
                <View style={styles.cardHeader}>
                  <FontAwesome name="comments-o" size={20} color="#1f3136" />
                </View>
                <Text style={styles.cardValue}>{stats.unreadMessages}</Text>
                <Text style={styles.cardLabel}>Unread Chats</Text>
              </Pressable>
            </Link>

            <Link href={"/(tabs)/menu" as any} asChild>
              <Pressable style={[styles.card, styles.cardTask]}>
                <View style={styles.cardHeader}>
                  <FontAwesome name="list-ul" size={20} color="#1f3136" />
                </View>
                <Text style={styles.cardValue}>{stats.pendingTasks}</Text>
                <Text style={styles.cardLabel}>Pending Tasks</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 24,
    backgroundColor: "#f7f7f5",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f7f5",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e2b2f",
  },
  subtitle: {
    fontSize: 15,
    color: "#5f6e73",
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e6e6",
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1f3136",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4c5f65",
  },
  cardArrival: {
    backgroundColor: "#dbe8f6",
  },
  cardDeparture: {
    backgroundColor: "#fce7c5",
  },
  cardMessage: {
    backgroundColor: "#e8f2e2",
  },
  cardTask: {
    backgroundColor: "#f2e2e8",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
});
