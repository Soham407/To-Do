import React from "react";
import { View, Text } from "react-native";
import { Agenda, DailyTask } from "../types";

interface ReportViewProps {
  tasks: DailyTask[];
  agendas: Agenda[];
}

const ReportView: React.FC<ReportViewProps> = ({ tasks, agendas }) => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Report / Insights (Coming Soon)</Text>
    </View>
  );
};
export default ReportView;
