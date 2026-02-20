import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/lib/auth";

export default function SignInScreen() {
  const { signInWithPassword, configError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const disabled = loading || !email.trim() || !password;

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const result = await signInWithPassword({
      email: email.trim(),
      password,
    });
    if (result) {
      setError(result);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.root}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Casaora Mobile</Text>
          <Text style={styles.subtitle}>Sign in with your Casaora account</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor="#8a9498"
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8a9498"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {configError ? <Text style={styles.error}>{configError}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.button,
              disabled ? styles.buttonDisabled : null,
              pressed && !disabled ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign in"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f7f7f5",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e6e6",
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e2b2f",
  },
  subtitle: {
    fontSize: 14,
    color: "#5f6e73",
    marginBottom: 6,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: "#334045",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6dbdc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1e2b2f",
    backgroundColor: "#fbfcfc",
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: "#b91c1c",
  },
  button: {
    borderRadius: 10,
    backgroundColor: "#1b6f65",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
