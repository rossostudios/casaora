import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/lib/auth";

const CHECKLIST_ITEMS = [
  "Set EXPO_PUBLIC_API_BASE_URL in .env.local",
  "Set EXPO_PUBLIC_SUPABASE_URL in .env.local",
  "Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
  "Optionally set EXPO_PUBLIC_DEFAULT_ORG_ID in .env.local",
  "Run npm install in apps/mobile",
  "Launch with npm run ios or npm run android",
  "Implement tasks and reservation workflows",
];

export default function SetupScreen() {
  const { session, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text style={styles.title}>Setup Checklist</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session</Text>
        <Text style={styles.item}>Email: {session?.user.email ?? "-"}</Text>
        <Text style={styles.item}>User ID: {session?.user.id ?? "-"}</Text>
        <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {CHECKLIST_ITEMS.map((item, index) => (
          <View key={item} style={styles.row}>
            <Text style={styles.index}>{index + 1}.</Text>
            <Text style={styles.item}>{item}</Text>
          </View>
        ))}
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
    fontSize: 24,
    fontWeight: "700",
    color: "#1e2b2f",
  },
  card: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e6e6",
    gap: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#223238",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  index: {
    width: 20,
    fontSize: 14,
    fontWeight: "700",
    color: "#334045",
  },
  item: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#334045",
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: "#1b6f65",
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
