import {
  WithSpringConfig,
  WithTimingConfig,
  Easing,
} from "react-native-reanimated";

/**
 * Standard Apple-style spring configuration
 * Bouncy but controlled, feels "physical"
 */
export const SPRING_CONFIG: WithSpringConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

/**
 * Heavy spring for large UI transitions
 */
export const HEAVY_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 100,
  mass: 1,
};

/**
 * Standard timing configuration for subtle fades
 */
export const TIMING_CONFIG: WithTimingConfig = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

/**
 * Animation duration constants
 */
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
};
