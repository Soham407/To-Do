import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../api/supabase";
import { useTheme } from "../../context/ThemeContext";
import { Fonts } from "../../config/theme";
import { MaterialSpinner } from "../../components/common/MaterialSpinner";

interface SignupScreenProps {
  onLogin: () => void;
}

export default function SignupScreen({ onLogin }: SignupScreenProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Signup Failed", error.message);
    } else {
      Alert.alert("Success", "Check your email for the confirmation link!");
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.onBackground }]}>
          Create Account
        </Text>
        <Text style={[styles.subtitle, { color: theme.outline }]}>
          Sign up to get started
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
            Email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceContainer,
                color: theme.onSurface,
                borderColor: theme.outline,
              },
            ]}
            placeholder="email@example.com"
            placeholderTextColor={theme.onSurfaceVariant}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceContainer,
                color: theme.onSurface,
                borderColor: theme.outline,
              },
            ]}
            placeholder="********"
            placeholderTextColor={theme.onSurfaceVariant}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <MaterialSpinner color={theme.onPrimary} size={24} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onLogin} style={styles.linkButton}>
          <Text style={[styles.linkText, { color: theme.primary }]}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  button: {
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
    padding: 8,
  },
  linkText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
});
