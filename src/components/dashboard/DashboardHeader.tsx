import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  ChevronDown,
  Sparkles,
  UserCircle,
  List as ListIcon,
  KanbanSquare,
  Zap,
  FolderOpen,
} from "lucide-react-native";
import { Theme } from "../context/ThemeContext";
import ProgressOverview from "./ProgressOverview";
import ListsFilterBar from "./ListsFilterBar";
import { Agenda, DailyTask, List } from "../../types";
import { getLocalDateString } from "../../utils/logic";

interface DashboardHeaderProps {
  theme: any;
  isDark: boolean;
  styles: any;
  formattedDate: string;
  selectedDate: string;
  searchText: string;
  setSearchText: (text: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: any) => void;
  setSelectedDate: (date: string) => void;
  viewMode: "LIST" | "BOARD";
  setViewMode: (mode: "LIST" | "BOARD") => void;
  setIsCalendarOpen: (open: boolean) => void;
  setIsTemplatesOpen: (open: boolean) => void;
  setIsListsOpen: (open: boolean) => void;
  setIsCoachChatOpen: (open: boolean) => void;
  setIsProfileOpen: (open: boolean) => void;
  tasks: DailyTask[];
  agendas: Agenda[];
  lists: List[];
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
  goalCounts: Record<string, number>;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  theme,
  isDark,
  styles,
  formattedDate,
  selectedDate,
  searchText,
  setSearchText,
  activeFilter,
  setActiveFilter,
  setSelectedDate,
  viewMode,
  setViewMode,
  setIsCalendarOpen,
  setIsTemplatesOpen,
  setIsListsOpen,
  setIsCoachChatOpen,
  setIsProfileOpen,
  tasks,
  agendas,
  lists,
  selectedListId,
  setSelectedListId,
  goalCounts,
}) => {
  return (
    <BlurView
      intensity={Platform.OS === "ios" ? 40 : 60}
      tint={isDark ? "dark" : "light"}
      style={styles.headerWrapper}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setIsCalendarOpen(true)}
          style={styles.dateSelector}
        >
          <Text style={styles.dateSubtext}>
            {formattedDate}{" "}
            <ChevronDown size={16} color={theme.onSurfaceVariant} />
          </Text>
          <Text style={styles.dateTitle}>
            {selectedDate === getLocalDateString() ? "Today" : "Your Plan"}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setIsTemplatesOpen(true)}
            style={[
              styles.coachBtn,
              {
                backgroundColor: theme.secondaryContainer + "40",
                borderColor: theme.secondary + "30",
              },
            ]}
            accessibilityLabel="Quick start templates"
            accessibilityRole="button"
          >
            <Zap size={20} color={theme.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsListsOpen(true)}
            style={[
              styles.coachBtn,
              {
                backgroundColor: theme.tertiaryContainer + "40",
                borderColor: theme.tertiary + "30",
              },
            ]}
            accessibilityLabel="Manage lists"
            accessibilityRole="button"
          >
            <FolderOpen size={20} color={theme.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsCoachChatOpen(true)}
            style={styles.coachBtn}
            accessibilityLabel="AI Coach"
            accessibilityRole="button"
          >
            <Sparkles size={22} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsProfileOpen(true)}
            style={styles.profileBtn}
            accessibilityLabel="Profile settings"
            accessibilityRole="button"
          >
            <UserCircle size={32} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={theme.onSurfaceVariant}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContainer}
        >
          {(
            ["All", "Today", "Upcoming", "Overdue", "High Priority"] as const
          ).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                activeFilter === f && styles.filterChipActive,
                { marginRight: 8 },
              ]}
              onPress={() => {
                setActiveFilter(f);
                if (f === "Today") setSelectedDate(getLocalDateString());
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.viewToggleBtn}
          onPress={() => setViewMode(viewMode === "LIST" ? "BOARD" : "LIST")}
          accessibilityLabel={
            viewMode === "LIST" ? "Switch to board view" : "Switch to list view"
          }
        >
          {viewMode === "LIST" ? (
            <KanbanSquare size={20} color={theme.onSurfaceVariant} />
          ) : (
            <ListIcon size={20} color={theme.onSurfaceVariant} />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Overview - Only show on Today filter */}
      {activeFilter === "Today" && (
        <ProgressOverview tasks={tasks} agendas={agendas} theme={theme} />
      )}

      {/* Lists Filter Bar */}
      <ListsFilterBar
        lists={lists}
        selectedListId={selectedListId}
        onSelectList={setSelectedListId}
        theme={theme}
        goalCounts={goalCounts}
      />
    </BlurView>
  );
};

export default DashboardHeader;
