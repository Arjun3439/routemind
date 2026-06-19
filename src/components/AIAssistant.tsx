// ============================================================
// RouteMind — AI Assistant (Floating Button + Chat Modal)
// ============================================================
// Powered by Groq (llama-3.3-70b-versatile). Appears as a small
// glowing FAB in the bottom-right corner of any screen.
// Tap to open a full chat panel — ask anything about places,
// routes, or the RouteMind app.
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { COLORS, SPACING, FONT_SIZE, RADIUS } from "@/constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Groq config ──────────────────────────────────────────────
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!;
const GROQ_MODEL = process.env.EXPO_PUBLIC_GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are RouteMind AI, a friendly and knowledgeable travel assistant embedded in the RouteMind app.

RouteMind helps travelers discover amazing stops, hidden gems, restaurants, cafés, viewpoints, and attractions along their driving routes using AI-powered recommendations.

Your role:
- Help users find great places along their routes
- Answer questions about the app features (route planning, AI filters, community tips, review summaries, place details)
- Give travel advice, suggest what to look for on specific routes
- Help interpret place ratings, detour times, and worth-stop scores
- Be enthusiastic, concise, and friendly — like a knowledgeable travel buddy

Worth-Stop Score: 0–100 score combining rating, number of reviews, detour distance, and community data.
Categories: restaurant, café, attraction, hidden gem, viewpoint, shopping, gas station, hotel.

Keep answers short (2-4 sentences max) unless the user asks for detail. Use relevant emojis sparingly.`;

// ─── Types ────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Groq API call ────────────────────────────────────────────
async function askGroq(messages: { role: string; content: string }[]): Promise<string> {
  const response = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 512,
    },
    {
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
    }
  );
  return response.data?.choices?.[0]?.message?.content?.trim() || "I couldn't generate a response. Please try again.";
}

// ─── Typing Indicator ─────────────────────────────────────────
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.typingBubble}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messagRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.assistantAvatar}>
          <Text style={styles.assistantAvatarText}>✦</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
          {message.content}
        </Text>
        <Text style={styles.bubbleTime}>
          {message.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Suggested Questions ──────────────────────────────────────
const SUGGESTIONS = [
  "What is a Worth-Stop Score?",
  "How do I find hidden gems?",
  "Best food stops on Chennai–Bangalore?",
  "How does the detour time work?",
];

// ─── Main Component ───────────────────────────────────────────
export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // FAB pulse animation
  const fabPulse = useRef(new Animated.Value(1)).current;
  const fabGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(fabPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabGlow, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(fabGlow, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const glowOpacity = fabGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  // Welcome message when first opened
  const handleOpen = useCallback(() => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hey! I'm your RouteMind AI 🗺️ Ask me anything about places, routes, or how the app works!",
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      // Build conversation history for Groq (exclude welcome message if it's the only one)
      const history = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const reply = await askGroq(history);

      const assistantMessage: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } catch (err: any) {
      const errMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I couldn't reach the server right now. Please try again in a moment 🙏",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, scrollToBottom]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content: "Chat cleared! Ask me anything about RouteMind 🗺️",
        timestamp: new Date(),
      },
    ]);
  }, []);

  return (
    <>
      {/* ── Floating Action Button ── */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        {/* Glow ring */}
        <Animated.View style={[styles.fabGlow, { opacity: glowOpacity }]} />
        <Animated.View style={{ transform: [{ scale: fabPulse }] }}>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleOpen}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#2563EB", "#06B6D4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Text style={styles.fabIcon}>✦</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Chat Modal ── */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoider}
          >
            <View style={styles.modalSheet}>
              {/* Header */}
              <LinearGradient
                colors={["#0F172A", "#0F172A"]}
                style={styles.modalHeader}
              >
                <View style={styles.modalHeaderLeft}>
                  <LinearGradient
                    colors={["#2563EB", "#06B6D4"]}
                    style={styles.headerAvatarGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.headerAvatarText}>✦</Text>
                  </LinearGradient>
                  <View>
                    <Text style={styles.modalTitle}>RouteMind AI</Text>
                    <View style={styles.onlineDot}>
                      <View style={styles.onlineDotCircle} />
                      <Text style={styles.onlineText}>Powered by Groq</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity style={styles.headerBtn} onPress={clearChat}>
                    <Text style={styles.headerBtnText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerBtn} onPress={() => setOpen(false)}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                renderItem={({ item }) => <MessageBubble message={item} />}
                ListFooterComponent={isLoading ? <TypingIndicator /> : null}
                onContentSizeChange={scrollToBottom}
              />

              {/* Suggestion chips — show only on first message */}
              {messages.length <= 1 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={SUGGESTIONS}
                    keyExtractor={(s) => s}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.suggestionChip}
                        onPress={() => sendMessage(item)}
                      >
                        <Text style={styles.suggestionChipText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Input Row */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask anything about places or routes..."
                  placeholderTextColor={COLORS.textMuted}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => sendMessage()}
                  returnKeyType="send"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
                  onPress={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <LinearGradient
                      colors={["#2563EB", "#06B6D4"]}
                      style={styles.sendBtnGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.sendIcon}>↑</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  // FAB
  fabContainer: {
    position: "absolute",
    bottom: 100,
    right: SPACING.base,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  fabGlow: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 1,
    elevation: 20,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(6,182,212,0.5)",
  },
  fabGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fabIcon: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.7)",
    justifyContent: "flex-end",
  },
  keyboardAvoider: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    height: SCREEN_HEIGHT * 0.82,
    backgroundColor: "#0A1628",
    borderTopLeftRadius: RADIUS["3xl"],
    borderTopRightRadius: RADIUS["3xl"],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    overflow: "hidden",
  },

  // Header
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  headerAvatarGrad: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  onlineDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineDotCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  onlineText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  headerBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerBtnText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  closeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },

  // Messages
  messagesList: { flex: 1 },
  messagesContent: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    gap: SPACING.sm,
  },
  messagRow: {
    flexDirection: "row",
    marginBottom: SPACING.xs,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAssistant: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.2)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.xs,
    marginBottom: 16,
  },
  assistantAvatarText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  bubbleUser: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: FONT_SIZE.base,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: "#fff",
  },
  bubbleTextAssistant: {
    color: COLORS.textPrimary,
  },
  bubbleTime: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
    alignSelf: "flex-end",
  },

  // Typing indicator
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginLeft: 36,
    marginTop: SPACING.xs,
    alignSelf: "flex-start",
    width: 64,
    height: 36,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.textMuted,
  },

  // Suggestions
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingVertical: SPACING.sm,
  },
  suggestionsList: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.xs,
  },
  suggestionChip: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.3)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
  },
  suggestionChipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Input
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: SPACING.base,
    paddingBottom: Platform.OS === "ios" ? SPACING.xl : SPACING.base,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0A1628",
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendIcon: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "800",
  },
});
