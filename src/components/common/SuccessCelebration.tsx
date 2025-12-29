import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");

interface SuccessCelebrationProps {
  onComplete: () => void;
}

const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  onComplete,
}) => {
  const { theme } = useTheme();
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Generate confetti particles
  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    translateY: useRef(new Animated.Value(0)).current,
    translateX: useRef(new Animated.Value((Math.random() - 0.5) * width))
      .current,
    rotate: useRef(new Animated.Value(0)).current,
    color: [
      theme.primary,
      theme.secondary,
      theme.tertiary,
      "#FFC107",
      "#FF9800",
      "#4CAF50",
    ][i % 6],
  }));

  useEffect(() => {
    // Checkmark animation
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1.2,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(checkRotate, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Confetti animation
    confettiPieces.forEach((piece, index) => {
      Animated.parallel([
        Animated.timing(piece.translateY, {
          toValue: height,
          duration: 2000 + Math.random() * 1000,
          delay: index * 20,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotate, {
          toValue: 360 * (3 + Math.random() * 2),
          duration: 2000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Fade out and complete
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onComplete());
    }, 2000);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.confetti,
            {
              backgroundColor: piece.color,
              transform: [
                { translateX: piece.translateX },
                { translateY: piece.translateY },
                {
                  rotate: piece.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {/* Success Checkmark */}
      <Animated.View
        style={[
          styles.checkContainer,
          {
            transform: [
              { scale: checkScale },
              {
                rotate: checkRotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["-180deg", "0deg"],
                }),
              },
            ],
          },
        ]}
      >
        <Check size={80} color={theme.onPrimary} strokeWidth={4} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 999,
  },
  checkContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confetti: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 2,
    top: height * 0.5,
  },
});

export default SuccessCelebration;
