import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { MD3LightTheme, Fonts } from "../../config/theme";
import { Z_INDEX } from "../../config/zIndex";

interface Props {
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
  animationType?: "none" | "slide" | "fade";
  fullScreen?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * SafeModal wraps a Modal with error boundary protection.
 * If an error occurs inside the modal, it shows a friendly error UI
 * instead of crashing the entire app.
 */
class SafeModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("SafeModal caught an error:", error, errorInfo);
  }

  // Reset error state when modal is reopened
  componentDidUpdate(prevProps: Props) {
    if (!prevProps.visible && this.props.visible && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const {
      children,
      visible,
      onClose,
      animationType = "fade",
      fullScreen = false,
    } = this.props;
    const { hasError, error } = this.state;

    return (
      <Modal
        visible={visible}
        animationType={animationType}
        transparent={!fullScreen}
        onRequestClose={onClose}
      >
        {hasError ? (
          <View
            style={[styles.errorOverlay, fullScreen && styles.fullScreenError]}
          >
            <View style={styles.errorCard}>
              <View style={styles.iconContainer}>
                <AlertTriangle size={40} color="#F44336" />
              </View>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorMessage}>
                This dialog encountered an error. Your data is safe.
              </Text>
              {__DEV__ && error && (
                <Text style={styles.errorDetail}>{error.message}</Text>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityLabel="Close modal"
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={this.handleRetry}
                  accessibilityLabel="Try again"
                >
                  <RefreshCw size={16} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          children
        )}
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  errorOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 24,
    zIndex: Z_INDEX.MODAL_BACKDROP,
  },
  fullScreenError: {
    backgroundColor: MD3LightTheme.background,
  },
  errorCard: {
    backgroundColor: MD3LightTheme.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    maxWidth: 360,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: MD3LightTheme.onSurface,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: MD3LightTheme.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  errorDetail: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: "#BF360C",
    backgroundColor: "#FFF3E0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 20,
    width: "100%",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: MD3LightTheme.surfaceContainerHigh,
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: MD3LightTheme.onSurface,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: MD3LightTheme.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#FFFFFF",
  },
});

export default SafeModal;
