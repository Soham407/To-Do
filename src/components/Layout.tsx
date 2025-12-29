import React, { ReactNode } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LayoutDashboard, Target, PieChart } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";

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
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  // Icon color logic:
  const getIconColor = (isActive: boolean) =>
    isActive ? theme.onSecondaryContainer : theme.onSurfaceVariant;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.content}>{children}</View>

      {showNav && (
        <View style={styles.navContainer}>
          <View style={styles.navBar}>
            {/* Dashboard Tab */}
            <TouchableOpacity
              onPress={() => onTabChange("dashboard")}
              style={styles.navButton}
            >
              {activeTab === "dashboard" && <View style={styles.activePill} />}
              <LayoutDashboard
                size={24}
                color={getIconColor(activeTab === "dashboard")}
                strokeWidth={activeTab === "dashboard" ? 2.5 : 2}
              />
            </TouchableOpacity>

            {/* Add Goal (Center) */}
            <TouchableOpacity
              onPress={() => onTabChange("onboarding")}
              style={styles.navButton}
            >
              {activeTab === "onboarding" && <View style={styles.activePill} />}
              <Target
                size={24}
                color={getIconColor(activeTab === "onboarding")}
                strokeWidth={activeTab === "onboarding" ? 2.5 : 2}
              />
            </TouchableOpacity>

            {/* Insights Tab */}
            <TouchableOpacity
              onPress={() => onTabChange("report")}
              style={styles.navButton}
            >
              {activeTab === "report" && <View style={styles.activePill} />}
              <PieChart
                size={24}
                color={getIconColor(activeTab === "report")}
                strokeWidth={activeTab === "report" ? 2.5 : 2}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const getStyles = (theme: any) =>
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
      bottom: 24,
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    },
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: theme.surfaceContainerHigh,
      width: "80%",
      paddingVertical: 12,
      borderRadius: 100,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    navButton: {
      alignItems: "center",
      justifyContent: "center",
      width: 64,
      height: 48,
    },
    activePill: {
      position: "absolute",
      width: 64,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.secondaryContainer,
      zIndex: -1,
    },
  });

export default Layout;
