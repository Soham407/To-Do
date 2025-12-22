import React, { ReactNode } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LayoutDashboard, Plus, PieChart } from "lucide-react-native";
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
  // Active: Icon is PrimaryContainer (on Dark BG)
  // Inactive: Icon is OnPrimaryContainer (on Light BG)
  const getIconColor = (isActive: boolean) =>
    isActive ? theme.primaryContainer : theme.onPrimaryContainer;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.content}>{children}</View>

      {showNav && (
        <View style={styles.navContainer}>
          <View style={styles.navBar}>
            {/* Dashboard Tab */}
            <TouchableOpacity
              onPress={() => onTabChange("dashboard")}
              style={[
                styles.navButton,
                activeTab === "dashboard" && styles.navButtonActive,
              ]}
            >
              <LayoutDashboard
                size={24}
                color={getIconColor(activeTab === "dashboard")}
                strokeWidth={2.5}
              />
            </TouchableOpacity>

            {/* Add Goal (Center) */}
            <TouchableOpacity
              onPress={() => onTabChange("onboarding")}
              style={[
                styles.navButton,
                styles.fabButton,
                activeTab === "onboarding" && styles.navButtonActive,
              ]}
            >
              <Plus
                size={28}
                color={getIconColor(activeTab === "onboarding")}
                strokeWidth={activeTab === "onboarding" ? 3 : 2.5}
              />
            </TouchableOpacity>

            {/* Insights Tab */}
            <TouchableOpacity
              onPress={() => onTabChange("report")}
              style={[
                styles.navButton,
                activeTab === "report" && styles.navButtonActive,
              ]}
            >
              <PieChart
                size={24}
                color={getIconColor(activeTab === "report")}
                strokeWidth={2.5}
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
      backgroundColor: theme.surfaceContainerLow,
    },
    content: {
      flex: 1,
    },
    navContainer: {
      position: "absolute",
      bottom: 30,
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    },
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-evenly",
      backgroundColor: theme.primaryContainer,
      width: "85%",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 50,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    navButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    fabButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    navButtonActive: {
      backgroundColor: theme.onPrimaryContainer,
    },
  });

export default Layout;
