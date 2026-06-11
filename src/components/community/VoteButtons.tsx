import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZE, RADIUS } from "@/constants";
import type { VoteTargetType } from "@/types";

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | null;
  targetType: VoteTargetType;
  targetId: string;
  onVote: (value: 1 | -1) => void;
  onRemoveVote: () => void;
  size?: "small" | "medium";
}

export default function VoteButtons({
  upvotes,
  downvotes,
  userVote,
  onVote,
  onRemoveVote,
  size = "medium",
}: VoteButtonsProps) {
  const netVotes = upvotes - downvotes;
  const iconSize = size === "small" ? 16 : 20;

  const handleUpvote = () => {
    if (userVote === 1) onRemoveVote();
    else onVote(1);
  };

  const handleDownvote = () => {
    if (userVote === -1) onRemoveVote();
    else onVote(-1);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleUpvote}
        style={[styles.button, userVote === 1 && styles.buttonActive]}
        activeOpacity={0.7}
      >
        <Ionicons
          name={userVote === 1 ? "arrow-up" : "arrow-up-outline"}
          size={iconSize}
          color={userVote === 1 ? COLORS.primary : COLORS.textSecondary}
        />
      </TouchableOpacity>

      <Text style={[styles.score, size === "small" && styles.scoreSmall]}>
        {netVotes}
      </Text>

      <TouchableOpacity
        onPress={handleDownvote}
        style={[styles.button, userVote === -1 && styles.buttonActiveDown]}
        activeOpacity={0.7}
      >
        <Ionicons
          name={userVote === -1 ? "arrow-down" : "arrow-down-outline"}
          size={iconSize}
          color={userVote === -1 ? COLORS.error : COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderTopLeftRadius: RADIUS.full,
    borderBottomLeftRadius: RADIUS.full,
  },
  buttonActiveDown: {
    backgroundColor: `${COLORS.error}20`,
    borderTopRightRadius: RADIUS.full,
    borderBottomRightRadius: RADIUS.full,
  },
  score: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  scoreSmall: {
    fontSize: FONT_SIZE.sm,
    minWidth: 20,
  },
});
