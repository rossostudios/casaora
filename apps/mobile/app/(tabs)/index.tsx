import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/lib/auth";
import { fetchHealth, fetchMe, type HealthResponse, type MeResponse } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/config";

type LoadState = {
  loading: boolean;
  error: string | null;
};

export default function OverviewScreen() {
  const { session, configError } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [healthState, setHealthState] = useState<LoadState>({
    loading: true,
    error: null,
  });
  const [meState, setMeState] = useState<LoadState>({
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setHealthState({ loading: true, error: null });
      try {
        const response = await fetchHealth();
        if (mounted) {
          setHealth(response);
        }
      } catch (err) {
        if (mounted) {
          setHealthState({
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load backend health",
          });
        }
      } finally {
        if (mounted) {
          setHealthState((current) => ({ ...current, loading: false }));
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!session) {
      setMe(null);
      setMeState({ loading: false, error: "Sign in to load /me." });
      return;
    }

    const run = async () => {
      setMeState({ loading: true, error: null });
      try {
        const response = await fetchMe();
        if (mounted) {
          setMe(response);
        }
      } catch (err) {
        if (mounted) {
          setMeState({
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load user context",
          });
        }
      } finally {
        if (mounted) {
          setMeState((current) => ({ ...current, loading: false }));
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text style={styles.title}>Casaora Mobile</Text>
      <Text style={styles.subtitle}>Backend: {getApiBaseUrl()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend Health</Text>
        {healthState.loading ? <ActivityIndicator size="small" /> : null}

        {!healthState.loading && health ? (
          <View style={styles.stack}>
            <Text style={styles.ok}>Status: {health.status}</Text>
            <Text style={styles.body}>Server time: {health.now}</Text>
          </View>
        ) : null}

        {!healthState.loading && healthState.error ? (
          <Text style={styles.error}>{healthState.error}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Authenticated User</Text>
        {meState.loading ? <ActivityIndicator size="small" /> : null}

        {!meState.loading && me ? (
          <View style={styles.stack}>
            <Text style={styles.body}>User ID: {String(me.user?.id ?? "-")}</Text>
            <Text style={styles.body}>Email: {String(me.user?.email ?? "-")}</Text>
            <Text style={styles.body}>
              Memberships: {Array.isArray(me.memberships) ? me.memberships.length : 0}
            </Text>
          </View>
        ) : null}

        {!meState.loading && meState.error ? <Text style={styles.error}>{meState.error}</Text> : null}
        {configError ? <Text style={styles.error}>{configError}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: "#f7f7f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e2b2f",
  },
  subtitle: {
    fontSize: 13,
    color: "#5f6e73",
  },
  card: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e6e6",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#223238",
  },
  stack: {
    gap: 6,
  },
  ok: {
    color: "#166534",
    fontSize: 15,
    fontWeight: "600",
  },
  body: {
    color: "#334045",
    fontSize: 14,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    lineHeight: 18,
  },
});
