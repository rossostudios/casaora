import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    listProperties,
    resolveActiveOrgId,
    type Property,
} from "@/lib/api";

export default function PropertiesScreen() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
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

    const loadProperties = useCallback(
        async (isRefresh: boolean) => {
            if (!orgId) return;
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            try {
                const rows = await listProperties({ orgId, limit: 100 });
                setProperties(rows);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to load properties");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [orgId]
    );

    useEffect(() => {
        if (orgId) loadProperties(false);
    }, [orgId, loadProperties]);

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" />
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={
                        properties.length === 0 ? styles.emptyContainer : styles.listContainer
                    }
                    data={properties}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => loadProperties(true)} />
                    }
                    renderItem={({ item }) => (
                        <Link href={{ pathname: "/properties/[id]", params: { id: item.id } }} asChild>
                            <Pressable style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.propertyName}>{item.name}</Text>
                                    <View style={[styles.statusChip, item.status === "active" ? styles.statusActive : styles.statusInactive]}>
                                        <Text style={styles.statusText}>{item.status === "active" ? "Active" : "Inactive"}</Text>
                                    </View>
                                </View>
                                <Text style={styles.address}>
                                    {[item.address_line1, item.city, item.country_code].filter(Boolean).join(", ")}
                                </Text>
                            </Pressable>
                        </Link>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>No properties found</Text>
                            <Text style={styles.emptyBody}>Properties associated with your organization will appear here.</Text>
                            {error ? <Text style={styles.error}>{error}</Text> : null}
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f7f7f5" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContainer: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 24, gap: 10 },
    emptyContainer: { flexGrow: 1, padding: 16, justifyContent: "center" },
    emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: "#e2e6e6", backgroundColor: "#fff", padding: 16, gap: 6 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1f3136" },
    emptyBody: { fontSize: 14, color: "#4c5f65" },
    error: { fontSize: 13, color: "#b91c1c" },
    card: { borderRadius: 12, borderWidth: 1, borderColor: "#e2e6e6", backgroundColor: "#fff", padding: 14, gap: 6 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    propertyName: { fontSize: 16, fontWeight: "700", color: "#1f3136", flex: 1, marginRight: 8 },
    address: { fontSize: 14, color: "#587078", marginTop: 4 },
    statusChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    statusActive: { backgroundColor: "#d8f2e2" },
    statusInactive: { backgroundColor: "#f0f2f2" },
    statusText: { fontSize: 11, fontWeight: "700", color: "#1b2c30" },
});
