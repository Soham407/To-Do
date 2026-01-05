import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { MD3Theme, Fonts } from "../../config/theme";
import {
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react-native";
import { Z_INDEX } from "../../config/zIndex";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
}

const ToastContext = React.createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => React.useContext(ToastContext);

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { theme, isDark } = useTheme();
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((config: ToastConfig) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast(config);
    setVisible(true);

    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const duration = config.duration ?? 4000;
    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setToast(null);
    });
  }, []);

  const styles = getStyles(theme, isDark, toast?.type || "info");

  const getIcon = () => {
    const iconColor = styles.iconColor;
    switch (toast?.type) {
      case "success":
        return <CheckCircle size={20} color={iconColor} />;
      case "error":
        return <AlertCircle size={20} color={iconColor} />;
      case "warning":
        return <AlertTriangle size={20} color={iconColor} />;
      default:
        return <Info size={20} color={iconColor} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && toast && (
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              opacity,
            },
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>{getIcon()}</View>
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action && (
              <TouchableOpacity
                onPress={() => {
                  toast.action?.onPress();
                  hideToast();
                }}
                style={styles.actionButton}
              >
                <Text style={styles.actionText}>{toast.action.label}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={hideToast}
              style={styles.closeButton}
              accessibilityLabel="Dismiss notification"
            >
              <X size={16} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const getStyles = (theme: MD3Theme, isDark: boolean, type: ToastType) => {
  const colors = {
    success: {
      bg: isDark ? "#1B3D2E" : "#E8F5E9",
      border: isDark ? "#4CAF50" : "#81C784",
      icon: "#4CAF50",
    },
    error: {
      bg: isDark ? "#3D1B1B" : "#FFEBEE",
      border: isDark ? "#F44336" : "#E57373",
      icon: "#F44336",
    },
    warning: {
      bg: isDark ? "#3D2E1B" : "#FFF8E1",
      border: isDark ? "#FF9800" : "#FFB74D",
      icon: "#FF9800",
    },
    info: {
      bg: isDark ? "#1B2D3D" : "#E3F2FD",
      border: isDark ? "#2196F3" : "#64B5F6",
      icon: "#2196F3",
    },
  };

  const colorConfig = colors[type];

  return {
    container: {
      position: "absolute" as const,
      top: 60,
      left: 16,
      right: 16,
      zIndex: Z_INDEX.TOAST,
    },
    content: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: colorConfig.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colorConfig.border,
      padding: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    iconContainer: {
      marginRight: 10,
    },
    iconColor: colorConfig.icon,
    message: {
      flex: 1,
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurface,
    },
    actionButton: {
      marginLeft: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colorConfig.icon + "20",
      borderRadius: 8,
    },
    actionText: {
      fontSize: 12,
      fontFamily: Fonts.bold,
      color: colorConfig.icon,
    },
    closeButton: {
      marginLeft: 8,
      padding: 4,
    },
  };
};

export default ToastProvider;
