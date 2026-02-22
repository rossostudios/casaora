import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View, ScrollView } from "react-native";

export default function PropertyDetailScreen() {
    const { id } = useLocalSearchParams();

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Property Overview</Text>
            <Text style={styles.subtitle}>ID: {id}</Text>

            <View style={styles.card}>
                <Text style={styles.text}>This is a placeholder for the property details view. Future iterations will fetch and display comprehensive data for this property.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#f7f7f5",
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1e2b2f",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: "#587078",
        marginBottom: 20,
    },
    card: {
        padding: 16,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e2e6e6",
    },
    text: {
        fontSize: 15,
        color: "#1e2b2f",
        lineHeight: 22,
    }
});
