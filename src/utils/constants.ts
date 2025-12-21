import { FailureTag } from "../types";

export const FAILURE_TAG_LABELS: Record<
  FailureTag,
  { label: string; emoji: string }
> = {
  [FailureTag.SICK]: { label: "Sick", emoji: "🤒" },
  [FailureTag.WORK]: { label: "Work Overload", emoji: "💼" },
  [FailureTag.TIRED]: { label: "Tired", emoji: "😴" },
  [FailureTag.DISTRACTED]: { label: "Distracted", emoji: "🐿️" },
  [FailureTag.OTHER]: { label: "Other", emoji: "🤷" },
  [FailureTag.NONE]: { label: "None", emoji: "" },
};
