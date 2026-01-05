import React from "react";
import { TouchableOpacity } from "react-native";
import Animated, { withSpring } from "react-native-reanimated";
import { Plus } from "lucide-react-native";
import { SPRING_CONFIG } from "../../utils/animations";

interface DashboardFABProps {
  fabScale: any;
  theme: any;
  styles: any;
  onPress: () => void;
}

const DashboardFAB: React.FC<DashboardFABProps> = ({
  fabScale,
  theme,
  styles,
  onPress,
}) => {
  return (
    <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
      <TouchableOpacity
        style={{
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onPress}
        onPressIn={() => {
          fabScale.value = withSpring(0.9, SPRING_CONFIG);
        }}
        onPressOut={() => {
          fabScale.value = withSpring(1, SPRING_CONFIG);
        }}
        activeOpacity={1}
      >
        <Plus size={32} color={theme.onPrimaryContainer} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default DashboardFAB;
