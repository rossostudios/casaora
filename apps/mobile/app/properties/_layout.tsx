import { Stack } from "expo-router";

export default function PropertiesLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: "Properties" }} />
        </Stack>
    );
}
