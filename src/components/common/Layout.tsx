import React, { ReactNode } from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useTheme } from "../../context/ThemeContext";
import { MD3Theme, getShadow } from "../../config/theme";
import AnimatedTabBar from "./AnimatedTabBar";
import { Z_INDEX } from "../../config/zIndex";

interface LayoutProps {
  children: ReactNode;
  activeTab: "dashboard" | "onboarding" | "report";
  onTabChange: (tab: "dashboard" | "onboarding" | "report") => void;
  showNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  showNav = true,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(
    () => getStyles(theme, isDark, insets.bottom),
    [theme, isDark, insets.bottom]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.content}>{children}</View>

      {showNav && (
        <View style={styles.navContainer}>
          <BlurView
            intensity={Platform.OS === "ios" ? 80 : 100}
            tint={isDark ? "dark" : "light"}
            style={styles.blurWrapper}
          >
            <AnimatedTabBar
              activeTab={activeTab}
              onTabChange={onTabChange}
              theme={theme}
            />
          </BlurView>
        </View>
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme: MD3Theme, isDark: boolean, bottomInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    navContainer: {
      position: "absolute",
      bottom: Math.max(bottomInset, 20), // Ensure at least 20px from bottom, or safe area
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: Z_INDEX.TAB_BAR,
      ...getShadow("lg", theme, isDark),
    },
    blurWrapper: {
      width: "80%",
      maxWidth: 400,
      borderRadius: 100,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      backgroundColor: isDark ? "rgba(20,18,24,0.7)" : "rgba(254,247,255,0.7)",
    },
  });

export default Layout;
