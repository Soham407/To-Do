import React, { useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LayoutDashboard, Target, PieChart } from "lucide-react-native";
import { MD3Theme } from "../../config/theme";
import { SPRING_CONFIG } from "../../utils/animations";
import { Z_INDEX } from "../../config/zIndex";

interface AnimatedTabBarProps {
  activeTab: "dashboard" | "onboarding" | "report";
  onTabChange: (tab: "dashboard" | "onboarding" | "report") => void;
  theme: MD3Theme;
}

const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  activeTab,
  onTabChange,
  theme,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const tabs = ["dashboard", "onboarding", "report"] as const;
  const activeIndex = tabs.indexOf(activeTab);
  const translateX = useSharedValue(activeIndex);

  useEffect(() => {
    translateX.value = withSpring(activeIndex, SPRING_CONFIG);
  }, [activeIndex]);

  const animatedPillStyle = useAnimatedStyle(() => {
    const containerWidth = windowWidth * 0.8;
    const tabWidth = containerWidth / 3;
    const pillWidth = 64;
    const offset = (tabWidth - pillWidth) / 2;
    return {
      transform: [{ translateX: translateX.value * tabWidth + offset }],
    };
  });

  const getIconColor = (isActive: boolean) =>
    isActive ? theme.onSecondaryContainer : theme.onSurfaceVariant;

  return (
    <View style={styles.navBar}>
      <Animated.View
        style={[
          styles.activePill,
          { backgroundColor: theme.secondaryContainer },
          animatedPillStyle,
        ]}
      />

      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onTabChange(tab)}
          style={styles.navButton}
          accessibilityLabel={`${tab} tab`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab }}
        >
          {tab === "dashboard" && (
            <LayoutDashboard
              size={24}
              color={getIconColor(activeTab === "dashboard")}
              strokeWidth={activeTab === "dashboard" ? 2.5 : 2}
            />
          )}
          {tab === "onboarding" && (
            <Target
              size={24}
              color={getIconColor(activeTab === "onboarding")}
              strokeWidth={activeTab === "onboarding" ? 2.5 : 2}
            />
          )}
          {tab === "report" && (
            <PieChart
              size={24}
              color={getIconColor(activeTab === "report")}
              strokeWidth={activeTab === "report" ? 2.5 : 2}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 12, // 12px padding top and bottom
    position: "relative",
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    zIndex: Z_INDEX.BASE + 1,
  },
  activePill: {
    position: "absolute",
    width: 64,
    height: 32,
    borderRadius: 16,
    top: 12 + (56 - 32) / 2, // Centered vertically within the 56px height + 12px padding
    left: 0,
    zIndex: Z_INDEX.BASE,
  },
});

export default AnimatedTabBar;
