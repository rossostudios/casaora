import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  listReservations,
  resolveActiveOrgId,
  type Reservation,
} from "@/lib/api";

const DAYS_TO_SHOW = 40;
const PAST_DAYS = 7;

function generateDates() {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = -PAST_DAYS; i < DAYS_TO_SHOW - PAST_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const ALL_DATES = generateDates();

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatDateKey(new Date()));
  const datesListRef = useRef<FlatList<Date>>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveActiveOrgId()
      .then((id) => {
        if (!cancelled) setOrgId(id);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to resolve organization");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const loadReservations = useCallback(
    async (isRefresh: boolean) => {
      if (!orgId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        // Fetch a broader range to allow local filtering without re-fetching every tap
        const from = formatDateKey(ALL_DATES[0]);
        const to = formatDateKey(ALL_DATES[ALL_DATES.length - 1]);
        const rows = await listReservations({ orgId, from, to, limit: 1000 });
        setReservations(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load reservations");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    if (orgId) loadReservations(false);
  }, [orgId, loadReservations]);

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={() => loadReservations(true)} />,
    [loadReservations, refreshing]
  );

  // Filter locally by selected date
  const selectedReservations = useMemo(() => {
    return reservations.filter((r) => {
      const inStr = r.check_in?.slice(0, 10) || "";
      const outStr = r.check_out?.slice(0, 10) || "";
      return selectedDateStr >= inStr && selectedDateStr <= outStr;
    });
  }, [reservations, selectedDateStr]);

  const arrivals = selectedReservations.filter((r) => r.check_in?.slice(0, 10) === selectedDateStr);
  const departures = selectedReservations.filter((r) => r.check_out?.slice(0, 10) === selectedDateStr);

  // Scroll to current date on mount
  useEffect(() => {
    setTimeout(() => {
      if (datesListRef.current) {
        datesListRef.current.scrollToIndex({ index: PAST_DAYS, animated: true, viewPosition: 0.5 });
      }
    }, 500);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.calendarStrip}>
        <FlatList
          ref={datesListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendarContent}
          data={ALL_DATES}
          keyExtractor={(d) => d.toISOString()}
          getItemLayout={(data, index) => (
            { length: 60, offset: 60 * index, index }
          )}
          renderItem={({ item: d }) => {
            const dateStr = formatDateKey(d);
            const active = dateStr === selectedDateStr;
            const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
            const dayNum = d.getDate();

            return (
              <Pressable
                onPress={() => setSelectedDateStr(dateStr)}
                style={[styles.dateCell, active ? styles.dateCellActive : null]}
              >
                <Text style={[styles.dayName, active ? styles.textActive : null]}>{dayName}</Text>
                <Text style={[styles.dayNum, active ? styles.textActive : null]}>{dayNum}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {selectedDateStr === formatDateKey(new Date()) && (arrivals.length > 0 || departures.length > 0) && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryArrival]}>
            <Text style={styles.summaryNumber}>{arrivals.length}</Text>
            <Text style={styles.summaryLabel}>Arrivals</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryDeparture]}>
            <Text style={styles.summaryNumber}>{departures.length}</Text>
            <Text style={styles.summaryLabel}>Departures</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={
            selectedReservations.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          data={selectedReservations}
          keyExtractor={(item) => item.id}
          refreshControl={refreshControl}
          renderItem={({ item }) => <ReservationCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No reservations found</Text>
              <Text style={styles.emptyBody}>Try changing the date filter.</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
        />
      )}
    </View>
  );
}

function ReservationCard({ item }: { item: Reservation }) {
  const isArrival = item.check_in?.slice(0, 10) === new Date().toISOString().slice(0, 10);
  const isDeparture = item.check_out?.slice(0, 10) === new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.guestName}>{item.guest_name || "Unknown guest"}</Text>
        <View style={[styles.chip, chipForStatus(item.status)]}>
          <Text style={styles.chipText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.propertyName}>
        {[item.property_name, item.unit_name].filter(Boolean).join(" · ")}
      </Text>

      <View style={styles.datesRow}>
        <Text style={[styles.dateText, isArrival ? styles.dateHighlight : null]}>
          In: {formatDate(item.check_in)}
        </Text>
        <Text style={[styles.dateText, isDeparture ? styles.dateHighlight : null]}>
          Out: {formatDate(item.check_out)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {item.guests_count != null && (
          <Text style={styles.meta}>{item.guests_count} guests</Text>
        )}
        {item.source && <Text style={styles.meta}>{item.source}</Text>}
        {item.total_amount != null && (
          <Text style={styles.meta}>
            {item.currency === "PYG" ? "₲" : "$"}
            {item.total_amount.toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed);
}

function chipForStatus(status: string) {
  const s = status?.toLowerCase();
  if (s === "confirmed") return styles.chipSuccess;
  if (s === "checked_in") return styles.chipWarning;
  if (s === "cancelled") return styles.chipDanger;
  return styles.chipInfo;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  calendarStrip: { backgroundColor: "#fff", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e2e6e6" },
  calendarContent: { paddingHorizontal: 14, gap: 8 },
  dateCell: { width: 52, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#f7f7f5" },
  dateCellActive: { backgroundColor: "#1b6f65" },
  dayName: { fontSize: 11, fontWeight: "600", color: "#587078", textTransform: "uppercase", marginBottom: 4 },
  dayNum: { fontSize: 18, fontWeight: "700", color: "#1f3136" },
  textActive: { color: "#fff" },
  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  summaryArrival: { backgroundColor: "#dbe8f6" },
  summaryDeparture: { backgroundColor: "#fce7c5" },
  summaryNumber: { fontSize: 24, fontWeight: "800", color: "#1f3136" },
  summaryLabel: { fontSize: 12, color: "#4c5f65", fontWeight: "600" },
  listContainer: { paddingHorizontal: 14, paddingBottom: 24, gap: 10 },
  emptyContainer: { flexGrow: 1, padding: 16, justifyContent: "center" },
  emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: "#e2e6e6", backgroundColor: "#fff", padding: 16, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1f3136" },
  emptyBody: { fontSize: 14, color: "#4c5f65" },
  error: { fontSize: 13, color: "#b91c1c" },
  card: { borderRadius: 12, borderWidth: 1, borderColor: "#e2e6e6", backgroundColor: "#fff", padding: 14, gap: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  guestName: { fontSize: 15, fontWeight: "700", color: "#1f3136", flex: 1 },
  propertyName: { fontSize: 13, color: "#587078" },
  datesRow: { flexDirection: "row", gap: 16 },
  dateText: { fontSize: 13, color: "#4c5f65" },
  dateHighlight: { color: "#1b6f65", fontWeight: "700" },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 2 },
  meta: { fontSize: 12, color: "#587078" },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700", color: "#1b2c30" },
  chipSuccess: { backgroundColor: "#d8f2e2" },
  chipWarning: { backgroundColor: "#fce7c5" },
  chipDanger: { backgroundColor: "#f8d4d4" },
  chipInfo: { backgroundColor: "#dbe8f6" },
});
