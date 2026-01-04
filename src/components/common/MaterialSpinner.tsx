import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useAnimatedStyle,
  cancelAnimation,
} from "react-native-reanimated";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const MaterialSpinner: React.FC<Props> = ({
  size = 40,
  color,
  style,
}) => {
  const { theme } = useTheme();
  const spinnerColor = color || theme.primary; // Use theme primary by default

  const rotation = useSharedValue(0);
  const dashOffset = useSharedValue(0);

  // Constants for the circle
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    // 1. Rotation Animation (Linear spin)
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1 // Infinite
    );

    // 2. Dash Offset Animation (The "Breathing" curl effect)
    // Moves the start and end of the stroke to simulate expanding/contracting
    dashOffset.value = withRepeat(
      withSequence(
        withTiming(circumference * 0.25, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad), // Ease in-out
        }),
        withTiming(circumference * 0.75, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        })
      ),
      -1,
      true // Reverse for smooth loop
    );

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(dashOffset);
    };
  }, [circumference]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: `${rotation.value}deg` }],
    };
  });

  const animatedProps = useAnimatedProps(() => {
    // strokeDasharray: [length of stroke, length of gap]
    // We animate the gap/stroke ratio slightly or just the offset
    // For a simple 'breathing' effect we can oscillate the dasharray
    return {
      // A fixed dasharray with a moving offset provides a nice spinner
      // strokeDasharray: [circumference * 0.75, circumference],
      strokeDashoffset: dashOffset.value,
    };
  });

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: "center", justifyContent: "center" },
          animatedContainerStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={spinnerColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={[circumference * 0.75, circumference]} // Fixed 75% arc
            animatedProps={animatedProps}
            fill="transparent"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
