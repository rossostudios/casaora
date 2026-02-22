import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Link } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/lib/auth";

export default function MenuScreen() {
    const { signOut } = useAuth();

    return (
        <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic">
            <View style={styles.header}>
                <Text style={styles.title}>Menu</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Management</Text>

                <Link href={"/properties" as any} asChild>
                    <Pressable style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <FontAwesome name="building-o" size={20} color="#1b6f65" style={styles.icon} />
                            <Text style={styles.menuItemText}>Properties</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color="#a0acaf" />
                    </Pressable>
                </Link>

                <Link href={"/(tabs)/calendar" as any} asChild>
                    <Pressable style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <FontAwesome name="calendar-check-o" size={20} color="#1b6f65" style={styles.icon} />
                            <Text style={styles.menuItemText}>All Reservations</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color="#a0acaf" />
                    </Pressable>
                </Link>

                <Link href={"/(tabs)/tasks" as any} asChild>
                    <Pressable style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <FontAwesome name="list-ul" size={20} color="#1b6f65" style={styles.icon} />
                            <Text style={styles.menuItemText}>Tasks & Maintenance</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color="#a0acaf" />
                    </Pressable>
                </Link>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <Link href={"/(tabs)/profile" as any} asChild>
                    <Pressable style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <FontAwesome name="user" size={20} color="#1b6f65" style={styles.icon} />
                            <Text style={styles.menuItemText}>Profile</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color="#a0acaf" />
                    </Pressable>
                </Link>

                <Link href={"/(tabs)/notifications" as any} asChild>
                    <Pressable style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <FontAwesome name="bell" size={20} color="#1b6f65" style={styles.icon} />
                            <Text style={styles.menuItemText}>Notifications</Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color="#a0acaf" />
                    </Pressable>
                </Link>
            </View>

            <Pressable style={styles.signOutButton} onPress={signOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f7f5",
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: "#1e2b2f",
    },
    section: {
        marginBottom: 24,
        backgroundColor: "#ffffff",
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#e2e6e6",
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#5f6e73",
        textTransform: "uppercase",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: "#f7f7f5",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f2f2",
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    icon: {
        width: 28,
    },
    menuItemText: {
        fontSize: 16,
        color: "#1e2b2f",
        fontWeight: "500",
    },
    signOutButton: {
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 40,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: "#ffffff",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e2e6e6",
    },
    signOutText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#b91c1c",
    },
});
