import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { AlertTriangle, RefreshCw, X } from "lucide-react-native";
import { MD3LightTheme, Fonts } from "../../config/theme";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // Log to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color="#F44336" />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We encountered an unexpected error. Don't worry, your data is
              safe.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              accessibilityLabel="Try again"
              accessibilityRole="button"
            >
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Compact version for modals
export const ModalErrorBoundary: React.FC<Props> = ({ children, onError }) => {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={
        <View style={modalStyles.container}>
          <AlertTriangle size={32} color="#F44336" />
          <Text style={modalStyles.title}>Something went wrong</Text>
          <Text style={modalStyles.message}>
            Please close this modal and try again.
          </Text>
        </View>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: MD3LightTheme.background,
  },
  card: {
    backgroundColor: MD3LightTheme.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: MD3LightTheme.onSurface,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: MD3LightTheme.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  errorDetails: {
    maxHeight: 150,
    width: "100%",
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: "#E65100",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: "#BF360C",
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 8,
    fontFamily: Fonts.regular,
    color: "#BF360C",
    opacity: 0.8,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MD3LightTheme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    gap: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#FFFFFF",
  },
});

const modalStyles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: MD3LightTheme.onSurface,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: MD3LightTheme.onSurfaceVariant,
    textAlign: "center",
  },
});

export default ErrorBoundary;
