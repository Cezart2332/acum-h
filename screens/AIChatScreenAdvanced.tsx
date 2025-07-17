import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import { hapticFeedback, getShadow, TYPOGRAPHY } from "../utils/responsive";
import { AI_BASE_URL } from "../config";

const { width, height } = Dimensions.get("window");

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  intent?: string;
  recommendations?: RecommendationItem[];
  followUpQuestions?: string[];
  isLoading?: boolean;
  error?: boolean;
  confidence?: number;
  isStreaming?: boolean;
}

interface RecommendationItem {
  id?: string | number;
  name?: string;
  title?: string;
  category?: string;
  company?: string;
  address?: string;
  description?: string;
  rating?: number;
  likes?: number;
  image?: string;
  photo?: string;
  type?: "restaurant" | "event";
}

interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  context: any;
}

type AIChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AIChatScreen: React.FC = () => {
  const navigation = useNavigation<AIChatScreenNavigationProp>();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [userId] = useState(
    () => `user_${Math.random().toString(36).substr(2, 9)}`
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Initialize screen
  useEffect(() => {
    initializeChat();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initializeChat = async () => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: generateMessageId(),
      text: "👋 Hello! I'm your intelligent assistant for finding amazing restaurants and exciting events. What are you looking for today?",
      isUser: false,
      timestamp: new Date(),
      followUpQuestions: [
        "Find restaurants near me",
        "What events are happening today?",
        "Recommend a good Italian restaurant",
        "Show me upcoming concerts",
      ],
    };

    setMessages([welcomeMessage]);

    // Check AI service connectivity
    try {
      const response = await fetch(`${AI_BASE_URL}/health`);
      setIsConnected(response.ok);
    } catch (error) {
      console.warn("AI service not available:", error);
      setIsConnected(false);
    }
  };

  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputText.trim();
    if (!text) return;

    hapticFeedback("light");

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      text: text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    setTypingIndicator(true);
    setSuggestions([]);
    setShowSuggestions(false);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Create streaming message placeholder
      const responseMessageId = generateMessageId();
      const streamingMessage: Message = {
        id: responseMessageId,
        text: "",
        isUser: false,
        timestamp: new Date(),
        isStreaming: true,
        isLoading: true,
      };

      setMessages((prev) => [...prev, streamingMessage]);

      // Send request to advanced AI
      const response = await fetch(`${AI_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          user_id: userId,
          session_id: sessionId,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Handle regular JSON response
      const data = await response.json();
      updateStreamingMessage(responseMessageId, data.response, true, {
        recommendations: data.recommendations,
        followUpQuestions: data.follow_up_questions,
        confidence: data.confidence,
        intent: data.intent,
      });
    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message
      const errorMessage: Message = {
        id: generateMessageId(),
        text: isConnected
          ? "I apologize, but I encountered an error processing your request. Please try again."
          : "I'm currently offline. Please check your connection and try again.",
        isUser: false,
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => prev.slice(0, -1).concat([errorMessage]));
    } finally {
      setIsLoading(false);
      setTypingIndicator(false);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const updateStreamingMessage = (
    messageId: string,
    text: string,
    isComplete: boolean,
    additionalData?: any
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              text,
              isStreaming: !isComplete,
              isLoading: false,
              ...additionalData,
            }
          : msg
      )
    );
  };

  const getSuggestions = async (text: string) => {
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`${AI_BASE_URL}/api/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partial_query: text,
          user_id: userId,
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.warn("Error getting suggestions:", error);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    // Debounced suggestions
    if (text.trim()) {
      setTimeout(() => getSuggestions(text), 300);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleRecommendationPress = (item: RecommendationItem) => {
    hapticFeedback("medium");

    try {
      if (item.type === "event" || item.title) {
        // Navigate to EventScreen
        navigation.navigate("EventScreen", {
          event: {
            id: item.id?.toString() || "0",
            title: item.title || item.name || "Event",
            description: item.description || "",
            photo: item.photo || item.image || "",
            company: item.company || "",
            likes: item.likes || 0,
            tags: [],
          },
        });
      } else {
        // Navigate to Info (restaurant)
        navigation.navigate("Info", {
          company: {
            id:
              typeof item.id === "number"
                ? item.id
                : parseInt(item.id?.toString() || "0"),
            name: item.name || "Restaurant",
            category: item.category || "",
            address: item.address || "",
            description: item.description || "",
            profileImage: item.image || "",
            tags: [],
          },
        });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Could not open details. Please try again.");
    }
  };

  const clearConversation = async () => {
    try {
      await fetch(`${AI_BASE_URL}/api/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
        }),
      });

      // Reset local state
      setMessages([]);
      initializeChat();
      hapticFeedback("medium");
    } catch (error) {
      console.warn("Error clearing conversation:", error);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isLastMessage = index === messages.length - 1;

    return (
      <Animated.View
        key={message.id}
        style={[
          styles.messageContainer,
          message.isUser
            ? styles.userMessageContainer
            : styles.aiMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            message.isUser
              ? [styles.userMessage, { backgroundColor: theme.colors.primary }]
              : [styles.aiMessage, { backgroundColor: theme.colors.surface }],
            getShadow(2),
          ]}
        >
          {/* Message text */}
          <Text
            style={[
              styles.messageText,
              {
                color: message.isUser ? "#FFFFFF" : theme.colors.text,
                fontSize: 16,
                lineHeight: 22,
              },
            ]}
          >
            {message.text}
            {message.isStreaming && <Text style={styles.cursor}>|</Text>}
          </Text>

          {/* Confidence indicator for AI messages */}
          {!message.isUser && message.confidence && (
            <Text
              style={[styles.confidence, { color: theme.colors.textTertiary }]}
            >
              Confidence: {Math.round(message.confidence * 100)}%
            </Text>
          )}

          {/* Loading indicator */}
          {message.isLoading && (
            <ActivityIndicator
              size="small"
              color={message.isUser ? "#FFFFFF" : theme.colors.primary}
              style={styles.loadingIndicator}
            />
          )}

          {/* Recommendations */}
          {message.recommendations && message.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text
                style={[
                  styles.recommendationsTitle,
                  { color: theme.colors.text },
                ]}
              >
                Recommendations:
              </Text>
              {message.recommendations.slice(0, 3).map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.recommendationItem,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => handleRecommendationPress(item)}
                >
                  <Text
                    style={[
                      styles.recommendationName,
                      { color: theme.colors.text },
                    ]}
                  >
                    {item.name || item.title}
                  </Text>
                  {item.category && (
                    <Text
                      style={[
                        styles.recommendationCategory,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.category}
                    </Text>
                  )}
                  {item.address && (
                    <Text
                      style={[
                        styles.recommendationAddress,
                        { color: theme.colors.textTertiary },
                      ]}
                    >
                      📍 {item.address}
                    </Text>
                  )}
                  {item.rating && (
                    <Text
                      style={[
                        styles.recommendationRating,
                        { color: theme.colors.accent },
                      ]}
                    >
                      ⭐ {item.rating}/5.0
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Follow-up questions */}
          {message.followUpQuestions &&
            message.followUpQuestions.length > 0 && (
              <View style={styles.followUpContainer}>
                <Text
                  style={[
                    styles.followUpTitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  You might also ask:
                </Text>
                {message.followUpQuestions.slice(0, 3).map((question, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.followUpButton,
                      {
                        backgroundColor: theme.colors.accentLight + "20",
                        borderColor: theme.colors.accent + "40",
                      },
                    ]}
                    onPress={() => sendMessage(question)}
                  >
                    <Text
                      style={[
                        styles.followUpText,
                        { color: theme.colors.accent },
                      ]}
                    >
                      {question}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
        </View>

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            { color: theme.colors.textTertiary },
            message.isUser ? styles.userTimestamp : styles.aiTimestamp,
          ]}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </Animated.View>
    );
  };

  const renderTypingIndicator = () => {
    if (!typingIndicator) return null;

    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View
          style={[
            styles.messageBubble,
            styles.aiMessage,
            { backgroundColor: theme.colors.surface },
            getShadow(2),
          ]}
        >
          <View style={styles.typingContainer}>
            <Text
              style={[styles.typingText, { color: theme.colors.textSecondary }]}
            >
              AI is thinking
            </Text>
            <View style={styles.typingDots}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.typingDot,
                    { backgroundColor: theme.colors.textSecondary },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <View
        style={[
          styles.suggestionsContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsContent}
        >
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.suggestionItem,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => {
                setInputText(suggestion);
                setShowSuggestions(false);
                sendMessage(suggestion);
              }}
            >
              <Text
                style={[styles.suggestionText, { color: theme.colors.text }]}
              >
                {suggestion}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <UniversalScreen>
      <StatusBar
        backgroundColor={theme.colors.primary}
        barStyle={theme.statusBarStyle}
      />

      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={[styles.aiIcon, { backgroundColor: "#FFFFFF20" }]}>
              <MaterialIcons name="psychology" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>
                AI Assistant
              </Text>
              <Text style={[styles.headerSubtitle, { color: "#FFFFFF80" }]}>
                {isConnected ? "Online • Enhanced" : "Offline"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: "#FFFFFF20" }]}
            onPress={clearConversation}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages */}
      <Animated.View
        style={[
          styles.messagesContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => renderMessage(message, index))}
          {renderTypingIndicator()}
        </ScrollView>
      </Animated.View>

      {/* Suggestions */}
      {renderSuggestions()}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  color: theme.colors.text,
                  fontSize: 16,
                },
              ]}
              value={inputText}
              onChangeText={handleTextChange}
              placeholder="Ask me about restaurants or events..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              maxLength={500}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim()
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={
                    inputText.trim() ? "#FFFFFF" : theme.colors.textTertiary
                  }
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </UniversalScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 25,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: width * 0.8,
    padding: 16,
    borderRadius: 18,
  },
  userMessage: {
    borderBottomRightRadius: 6,
  },
  aiMessage: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  cursor: {
    opacity: 0.7,
    fontWeight: "bold",
  },
  confidence: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
  loadingIndicator: {
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    textAlign: "right",
  },
  aiTimestamp: {
    textAlign: "left",
  },
  recommendationsContainer: {
    marginTop: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  recommendationItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  recommendationName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  recommendationCategory: {
    fontSize: 12,
    marginBottom: 2,
  },
  recommendationAddress: {
    fontSize: 11,
    marginBottom: 2,
  },
  recommendationRating: {
    fontSize: 11,
  },
  followUpContainer: {
    marginTop: 12,
  },
  followUpTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  followUpButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 6,
  },
  followUpText: {
    fontSize: 12,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    fontSize: 14,
    marginRight: 8,
  },
  typingDots: {
    flexDirection: "row",
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  suggestionsContent: {
    paddingHorizontal: 16,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});

export default AIChatScreen;
