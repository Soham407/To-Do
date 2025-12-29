jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "mocked-uuid"),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock lucide icons
jest.mock("lucide-react-native", () => ({
  ChevronDown: "ChevronDown",
  Calendar: "Calendar",
  Sparkles: "Sparkles",
  UserCircle: "UserCircle",
  List: "List",
  KanbanSquare: "KanbanSquare",
  Plus: "Plus",
  Check: "Check",
  X: "X",
  Trash: "Trash",
  Edit3: "Edit3",
  Eye: "Eye",
  ArrowLeft: "ArrowLeft",
  Send: "Send",
}));
