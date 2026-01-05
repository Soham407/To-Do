import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { supabase } from "../../api/supabase";
import { useTheme } from "../../context/ThemeContext";
import { Fonts } from "../../config/theme";
import * as Haptics from "expo-haptics";
import { MaterialSpinner } from "../../components/common/MaterialSpinner";

interface LoginScreenProps {
  onSignup: () => void;
}

export default function LoginScreen({ onSignup }: LoginScreenProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 47,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        triggerShake();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Login Failed", error.message);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/adaptive-icon.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Goal Coach Logo"
          />
        </View>
        <Text style={[styles.title, { color: theme.onBackground }]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: theme.outline }]}>
          Sign in to continue
        </Text>

        <Animated.View
          style={[
            styles.inputContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
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
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email address"
            autoComplete="email"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.inputContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
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
            accessibilityLabel="Password"
            accessibilityHint="Enter your password"
            autoComplete="password"
          />
        </Animated.View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityLabel="Login button"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <MaterialSpinner color={theme.onPrimary} size={24} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
              Login
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onSignup} style={styles.linkButton}>
          <Text style={[styles.linkText, { color: theme.primary }]}>
            Don't have an account? Sign Up
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
    minHeight: 56,
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
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
  },
});
