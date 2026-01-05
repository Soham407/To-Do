import { StyleSheet, Dimensions } from "react-native";
import { MD3Theme, Fonts, getShadow } from "../../config/theme";
import { Z_INDEX } from "../../config/zIndex";

export const getDashboardStyles = (theme: MD3Theme, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.background,
    },
    headerWrapper: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      marginHorizontal: -16, // Bleed to edges for blur
      marginBottom: 16,
      borderBottomWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: 8,
      marginBottom: 16,
    },
    searchContainer: {
      marginBottom: 12,
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchInput: {
      fontSize: 16,
      color: theme.onSurface,
      fontFamily: Fonts.regular,
    },
    filterScroll: {
      marginBottom: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 100,
      backgroundColor: theme.surfaceContainer,
      borderWidth: 1,
      borderColor: "transparent",
    },
    filterChipActive: {
      backgroundColor: theme.secondaryContainer,
      borderColor: theme.primary,
    },
    filterText: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      fontFamily: Fonts.medium,
    },
    filterTextActive: {
      color: theme.onSecondaryContainer,
    },
    dateSelector: {
      marginLeft: -4,
      padding: 8,
      borderRadius: 16,
    },
    dateSubtext: {
      flexDirection: "row",
      alignItems: "center",
      color: theme.onSurfaceVariant,
      fontSize: 14,
      fontFamily: Fonts.medium,
    },
    dateTitle: {
      fontSize: 32,
      color: theme.onSurface,
      fontFamily: Fonts.regular,
    },
    profileBtn: {
      padding: 12,
      marginLeft: 4,
    },
    coachBtn: {
      padding: 12,
      backgroundColor: theme.primaryContainer + "40",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.primary + "30",
      marginLeft: 8,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    listContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.primary,
      marginLeft: 4,
      marginBottom: 12,
    },
    // Card
    card: {
      padding: 16,
      borderRadius: 24,
      marginBottom: 12, // Increased spacing
      ...getShadow("sm", theme, isDark),
    },
    cardHeader: {
      position: "relative",
    },
    cardLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    cardRight: {
      position: "absolute",
      right: 0,
      top: 0,
      flexDirection: "row",
      gap: 4,
    },
    iconBox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    cardTitle: {
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: theme.onSurface,
      marginRight: 40,
    },
    cardSubtitle: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginTop: 2,
    },
    settingsBtn: {
      padding: 12, // 44px touch target
      margin: -4, // Visual compensation
    },
    textLineThrough: {
      textDecorationLine: "line-through",
      opacity: 0.6,
    },
    noteText: {
      marginTop: 8,
      marginLeft: 40,
      fontSize: 12,
      fontFamily: Fonts.regular,
      fontStyle: "italic",
      color: theme.onSurfaceVariant,
    },
    recalcBadge: {
      position: "absolute",
      top: 8,
      right: 8,
    },
    recalcText: {
      fontSize: 8,
      fontFamily: Fonts.bold,
      color: theme.primary,
    },
    progresBarTrack: {
      height: 8,
      width: "100%",
      backgroundColor: theme.surfaceVariant + "33",
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 24,
    },
    // Board Styles
    boardContainer: {
      paddingHorizontal: 16,
      gap: 16,
    },
    column: {
      width: Dimensions.get("window").width * 0.85,
      height: "100%",
    },
    columnHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: 16,
      marginBottom: 12,
    },
    columnTitle: {
      fontSize: 16,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    countBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    countText: {
      fontSize: 12,
      fontFamily: Fonts.bold,
    },
    viewToggleBtn: {
      padding: 10,
      backgroundColor: theme.surfaceContainer,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    filterContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    filterScrollContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: 8,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginBottom: 24,
      textAlign: "center",
    },
    createBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    createBtnText: {
      color: theme.onPrimary,
      fontFamily: Fonts.medium,
    },
    fab: {
      position: "absolute",
      bottom: 100, // Slightly improved for floating feel
      right: 24,
      width: 64,
      height: 64,
      borderRadius: 20, // Slightly more square/MacOS style
      backgroundColor: theme.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
      zIndex: Z_INDEX.FAB,
      ...getShadow("lg", theme, isDark),
    },
  });
