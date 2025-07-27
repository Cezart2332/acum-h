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
  Vibration,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import { BASE_URL } from "../config";
import PythonAIService, {
  MenuRecommendation,
} from "../services/PythonAIService";
import { useDebounce, useInputValidation } from "../hooks/useInputHelpers";

const { width, height } = Dimensions.get("window");

// Tab bar height constant (adjust based on your tab bar design)
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 90 : 70;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  intent?: string;
  searchResults?: SearchResults;
  recommendations?: MenuRecommendation[];
  isLoading?: boolean;
  error?: boolean;
  processingTime?: number;
}

interface SearchResults {
  restaurants: Restaurant[];
  events: Event[];
}

interface Restaurant {
  id: number;
  name: string;
  category: string;
  address: string;
  description: string;
  rating: number;
  image: string;
  tags: string[];
  relevance_score: number;
}

interface Event {
  id: number;
  title: string;
  description: string;
  company: string;
  photo: string;
  tags: string[];
  likes: number;
  relevance_score: number;
}

interface Suggestion {
  id: number;
  text: string;
  category: string;
  icon: string;
}

interface ChatResponse {
  success: boolean;
  response: string;
  intent: string;
  search_results: SearchResults;
  metadata: {
    response_time: number;
    timestamp: string;
    user_id?: string;
    data_freshness?: string;
  };
  error?: string;
}

interface SystemHealth {
  status: string;
  ai_system: {
    status: string;
    backend_connection: string;
    data_cache: {
      restaurants_count: number;
      events_count: number;
      last_updated: string;
    };
  };
  backend_url: string;
}

const AIChatScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [inputError, setInputError] = useState<string>("");

  // Get company from route params (optional)
  const company = route?.params?.company || null;

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const typingAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Input validation and debouncing
  const { validateMessage } = useInputValidation();

  // Debounced send function to prevent spam
  const debouncedSendMessage = useDebounce(
    useCallback(
      (text: string) => {
        const validation = validateMessage(text);
        if (!validation.isValid) {
          setInputError(validation.error || "Mesaj invalid");
          return;
        }
        setInputError("");
        sendMessageInternal(text);
      },
      [validateMessage]
    ),
    500 // 500ms debounce
  );

  // Enhanced useEffect with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;

    // Initialize welcome message and suggestions
    initializeChat();

    // Check system health
    checkSystemHealth();

    // Load backend data (companies and events)
    loadBackendData();

    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Cleanup function with comprehensive cleanup
    return () => {
      isMountedRef.current = false;
      debouncedSendMessage.cancel(); // Cancel any pending debounced calls

      if (typingAnimationRef.current) {
        typingAnimationRef.current.stop();
        typingAnimationRef.current = null;
      }

      typingAnim.stopAnimation();
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, [debouncedSendMessage]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  const checkSystemHealth = useCallback(async () => {
    try {
      console.log("Checking Python AI service health...");

      // Check Python AI service health
      const isAIAvailable = await PythonAIService.isAvailable();
      let aiStatus = "healthy";
      let aiConnection = "connected";

      if (!isAIAvailable) {
        console.warn("Python AI service is not available");
        aiStatus = "degraded";
        aiConnection = "disconnected";
      }

      if (isMountedRef.current) {
        setSystemHealth({
          status: isAIAvailable ? "healthy" : "degraded",
          ai_system: {
            status: aiStatus,
            backend_connection: aiConnection,
            data_cache: {
              restaurants_count: 0,
              events_count: 0,
              last_updated: new Date().toISOString(),
            },
          },
          backend_url: BASE_URL,
        });
        setConnectionError(!isAIAvailable);
      }
    } catch (error) {
      console.warn("Failed to check system health:", error);
      if (isMountedRef.current) {
        setConnectionError(true);
        // Set a degraded status when health check fails
        setSystemHealth({
          status: "degraded",
          ai_system: {
            status: "degraded",
            backend_connection: "disconnected",
            data_cache: {
              restaurants_count: 0,
              events_count: 0,
              last_updated: new Date().toISOString(),
            },
          },
          backend_url: BASE_URL,
        });
      }
    }
  }, []);

  const loadBackendData = useCallback(async () => {
    try {
      console.log("Loading backend data...");

      // Load companies and events from backend using PythonAIService
      const [companies, events] = await Promise.all([
        PythonAIService.fetchCompanies(),
        PythonAIService.fetchEvents(),
      ]);

      console.log(
        `Loaded ${companies.length} companies and ${events.length} events from backend`
      );

      // Update system health with real data
      if (isMountedRef.current) {
        setSystemHealth((prev) =>
          prev
            ? {
                ...prev,
                ai_system: {
                  ...prev.ai_system,
                  data_cache: {
                    restaurants_count: companies.length,
                    events_count: events.length,
                    last_updated: new Date().toISOString(),
                  },
                },
              }
            : null
        );
      }

      return { companies, events };
    } catch (error) {
      console.warn("Failed to load backend data:", error);
      return { companies: [], events: [] };
    }
  }, []);

  const initializeChat = useCallback(async () => {
    try {
      // Initialize Python AI service
      console.log("Initializing Python AI service...");
      await PythonAIService.initialize();
      console.log("Python AI service initialized successfully");
    } catch (error) {
      console.warn("Python AI service initialization failed:", error);
      // Continue with fallback functionality
    }

    // Add welcome message with system info
    const welcomeMessage: Message = {
      id: "welcome",
      text: company
        ? `Salut! 👋 Sunt asistentul tău AI pentru ${company.name}. Te pot ajuta cu recomandări de meniu, întrebări dietetice și informații despre felurile noastre de mâncare. Cu ce te pot ajuta?`
        : "Salut! 👋 Mă bucur să te văd! Sunt aici să te ajut să găsești cele mai bune restaurante și evenimente din oraș. Cu ce te pot ajuta?",
      isUser: false,
      timestamp: new Date(),
      intent: "greeting",
    };

    if (isMountedRef.current) {
      setMessages([welcomeMessage]);
    }

    // Only load suggestions if we have a company and backend data is available
    if (company && company.id) {
      try {
        console.log("Loading suggestions for company:", company.name);

        // Verify backend connectivity first
        const companies = await PythonAIService.fetchCompanies();
        if (companies.length > 0) {
          // Set context-aware suggestions for restaurant
          const companySuggestions = [
            {
              id: 1,
              text: "Ce îmi recomanzi din meniu?",
              category: "recommendation",
              icon: "🍽️",
            },
            {
              id: 2,
              text: "Ce opțiuni vegetariene aveți?",
              category: "dietary",
              icon: "🥗",
            },
            {
              id: 3,
              text: "Care este felul cel mai popular?",
              category: "popular",
              icon: "⭐",
            },
            {
              id: 4,
              text: "Caut ceva picant",
              category: "preference",
              icon: "🌶️",
            },
          ];

          if (isMountedRef.current) {
            setSuggestions(companySuggestions);
          }
        } else {
          // Backend not available - show error
          if (isMountedRef.current) {
            setInputError(
              "Îmi pare rău, nu am sugestii momentan. Te rog încearcă din nou mai târziu."
            );
            setSuggestions([]);
          }
        }
      } catch (error) {
        console.warn("Failed to load suggestions:", error);
        if (isMountedRef.current) {
          setInputError(
            "Îmi pare rău, nu am sugestii momentan. Te rog încearcă din nou mai târziu."
          );
          setSuggestions([]);
        }
      }
    } else {
      // No company context - no suggestions
      if (isMountedRef.current) {
        setSuggestions([]);
      }
    }
  }, [company]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      debouncedSendMessage(text);
    },
    [debouncedSendMessage, isLoading]
  );

  const sendMessageInternal = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      const loadingMessage: Message = {
        id: Date.now().toString() + "_loading",
        text: "",
        isUser: false,
        timestamp: new Date(),
        isLoading: true,
      };

      if (isMountedRef.current) {
        setMessages((prev) => [...prev, userMessage, loadingMessage]);
        setInputText("");
        setIsLoading(true);
        setShowSuggestions(false);
        setIsTyping(true);
        setInputError(""); // Clear any input errors
      }

      // Add to conversation history
      setConversationHistory((prev) => [...prev, text.trim()]);

      // Start typing animation
      typingAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      typingAnimationRef.current.start();

      try {
        let aiResponse = "";
        let intent = "general_chat";
        let recommendations: MenuRecommendation[] = [];

        // If we have a company, use PythonAI service
        if (company && company.id) {
          try {
            // Analyze user intent first
            const intentAnalysis = await PythonAIService.analyzeUserIntent(
              text.trim()
            );
            intent = intentAnalysis.intent;

            if (intent === "menu_recommendation") {
              // Get menu recommendations
              const menuResponse = await PythonAIService.getMenuRecommendations(
                company.id,
                text.trim(),
                [] // You can add dietary restrictions extraction here
              );
              recommendations = menuResponse.recommendations;
              aiResponse = menuResponse.explanation;
            } else {
              // Get conversational response about menu
              aiResponse = await PythonAIService.getChatResponse(
                company.id,
                text.trim(),
                conversationHistory.slice(-5) // Keep last 5 messages for context
              );
            }
          } catch (menuError) {
            console.error("MenuAI error:", menuError);
            // Set specific error based on the error type
            if (menuError.message?.includes("meniul")) {
              setInputError(
                "Îmi pare rău, nu pot procesa meniul acum. Încearcă mai târziu."
              );
            } else {
              // For menu errors, fall back to general search
              console.log("Menu error, falling back to general search");
              aiResponse = await PythonAIService.getChatResponse(
                null, // No specific company
                text.trim(),
                conversationHistory.slice(-5)
              );
            }

            if (!aiResponse) {
              return; // Exit early if no response and error set
            }
          }
        } else {
          // For queries without company context, use enhanced routing
          aiResponse = await PythonAIService.getChatResponse(
            null, // No specific company - will trigger intelligent routing
            text.trim(),
            conversationHistory.slice(-5)
          );
        }

        // Stop typing animation safely
        if (typingAnimationRef.current) {
          typingAnimationRef.current.stop();
          typingAnimationRef.current = null;
        }

        if (isMountedRef.current) {
          typingAnim.stopAnimation();
          setIsTyping(false);
        }

        // Only add AI message if we have actual response content
        if (aiResponse.trim()) {
          const aiMessage: Message = {
            id: Date.now().toString(),
            text: aiResponse,
            isUser: false,
            timestamp: new Date(),
            intent: intent,
            recommendations:
              recommendations.length > 0 ? recommendations : undefined,
          };

          if (isMountedRef.current) {
            setMessages((prev) => prev.slice(0, -1).concat([aiMessage]));
          }

          // Haptic feedback for successful response
          Vibration.vibrate(50);

          // Clear connection error if request was successful
          if (isMountedRef.current) {
            setConnectionError(false);
          }
        } else {
          // Remove loading message if no response
          if (isMountedRef.current) {
            setMessages((prev) => prev.slice(0, -1));
          }
        }
      } catch (error) {
        console.error("Chat error:", error);

        // Enhanced error classification
        const isConnectionError =
          error instanceof TypeError &&
          (error.message.includes("Network request failed") ||
            error.message.includes("fetch"));

        const isTimeoutError =
          error.message?.includes("timeout") ||
          error.message?.includes("AbortError");

        if (isMountedRef.current) {
          setConnectionError(isConnectionError || isTimeoutError);
        }

        let errorMessageText =
          "Scuze, am întâmpinat o problemă tehnică. Te rog încearcă din nou.";

        if (isConnectionError) {
          errorMessageText =
            "Nu pot să mă conectez la serverul AI. Te rog verifică conexiunea și încearcă din nou.";
        } else if (isTimeoutError) {
          errorMessageText =
            "Cererea a expirat. Te rog încearcă din nou cu un mesaj mai scurt.";
        }

        // Stop typing animation safely
        if (typingAnimationRef.current) {
          typingAnimationRef.current.stop();
          typingAnimationRef.current = null;
        }

        if (isMountedRef.current) {
          typingAnim.stopAnimation();
          setIsTyping(false);
          setMessages((prev) => prev.slice(0, -1)); // Remove loading message
          setInputError(errorMessageText); // Show error inline instead of chat message
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [company, conversationHistory]
  );

  const handleSuggestionPress = useCallback(
    (suggestion: Suggestion) => {
      sendMessage(suggestion.text);
    },
    [sendMessage]
  );

  const handleRestaurantPress = useCallback((restaurant: Restaurant) => {
    Alert.alert(
      restaurant.name,
      `${restaurant.description}\n\nCategorie: ${restaurant.category}\nAdresă: ${restaurant.address}\nRating: ${restaurant.rating}/5\n\nDorești să vezi mai multe detalii?`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Vezi meniul",
          onPress: () => getRestaurantMenu(restaurant.id),
        },
        {
          text: "Detalii complete",
          onPress: () => getRestaurantDetails(restaurant.id),
        },
      ]
    );
  }, []);

  const handleEventPress = useCallback((event: Event) => {
    Alert.alert(
      event.title,
      `${event.description}\n\nOrganizator: ${event.company}\nLike-uri: ${event.likes}\n\nDorești să vezi detalii complete?`,
      [
        { text: "Anulează", style: "cancel" },
        { text: "Vezi detalii", onPress: () => getEventDetails(event.id) },
      ]
    );
  }, []);

  const getRestaurantMenu = useCallback(async (restaurantId: number) => {
    try {
      const response = await fetch(
        `${BASE_URL}/companies/${restaurantId}/menu`
      );
      if (response.ok) {
        Alert.alert("Succes", "Meniul este disponibil pentru descărcare!");
        // Here you could implement PDF viewing or download
      } else {
        Alert.alert(
          "Info",
          "Meniul nu este disponibil pentru acest restaurant."
        );
      }
    } catch (error) {
      Alert.alert("Eroare", "Nu am putut să accesez meniul.");
    }
  }, []);

  const getRestaurantDetails = useCallback(async (restaurantId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/companies`);
      const data = await response.json();

      const company = data.find((c: any) => c.id === restaurantId);
      if (company) {
        Alert.alert(
          company.name,
          `Descriere: ${company.description}\nCategorie: ${company.category}\nAdresă: ${company.address}\nEmail: ${company.email}\nCUI: ${company.cui}\nLatitudine: ${company.latitude}\nLongitudine: ${company.longitude}`
        );
      } else {
        Alert.alert("Eroare", "Restaurantul nu a fost găsit.");
      }
    } catch (error) {
      Alert.alert("Eroare", "Nu am putut să accesez detaliile restaurantului.");
    }
  }, []);

  const getEventDetails = useCallback(async (eventId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/events`);
      const data = await response.json();

      const event = data.find((e: any) => e.id === eventId);
      if (event) {
        Alert.alert(
          event.title,
          `Descriere: ${event.description}\nCompanie: ${
            event.company
          }\nLike-uri: ${event.likes}\nTags: ${
            event.tags?.join(", ") || "Nu sunt disponibile"
          }`
        );
      } else {
        Alert.alert("Eroare", "Evenimentul nu a fost găsit.");
      }
    } catch (error) {
      Alert.alert("Eroare", "Nu am putut să accesez detaliile evenimentului.");
    }
  }, []);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getIntentIcon = useCallback((intent: string) => {
    switch (intent) {
      case "greeting":
        return "👋";
      case "restaurant_search":
        return "🍽️";
      case "food_search":
        return "🍕";
      case "event_search":
        return "🎉";
      case "recommendation":
        return "⭐";
      case "help":
        return "❓";
      case "location_search":
        return "📍";
      default:
        return "💬";
    }
  }, []);

  const renderSearchResults = useCallback(
    (searchResults: SearchResults) => {
      if (
        !searchResults ||
        (!searchResults.restaurants?.length && !searchResults.events?.length)
      ) {
        return null;
      }

      return (
        <View style={styles.searchResultsContainer}>
          {searchResults.restaurants &&
            searchResults.restaurants.length > 0 && (
              <View style={styles.resultSection}>
                <Text
                  style={[
                    styles.resultSectionTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  🍽️ Restaurante ({searchResults.restaurants.length})
                </Text>
                {searchResults.restaurants.slice(0, 3).map((restaurant) => (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[
                      styles.resultItem,
                      { backgroundColor: theme.colors.surface },
                    ]}
                    onPress={() => handleRestaurantPress(restaurant)}
                  >
                    <View style={styles.resultContent}>
                      <Text
                        style={[
                          styles.resultTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {restaurant.name}
                      </Text>
                      <Text
                        style={[
                          styles.resultCategory,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {restaurant.category}
                      </Text>
                      <Text
                        style={[
                          styles.resultDescription,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {restaurant.description.substring(0, 100)}...
                      </Text>
                      <View style={styles.resultMeta}>
                        <Text
                          style={[
                            styles.resultRating,
                            { color: theme.colors.accent },
                          ]}
                        >
                          ⭐ {restaurant.rating}/5
                        </Text>
                        <Text
                          style={[
                            styles.resultScore,
                            { color: theme.colors.textTertiary },
                          ]}
                        >
                          Relevanță:{" "}
                          {Math.round(restaurant.relevance_score * 100)}%
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

          {searchResults.events && searchResults.events.length > 0 && (
            <View style={styles.resultSection}>
              <Text
                style={[
                  styles.resultSectionTitle,
                  { color: theme.colors.text },
                ]}
              >
                🎉 Evenimente ({searchResults.events.length})
              </Text>
              {searchResults.events.slice(0, 3).map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.resultItem,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  onPress={() => handleEventPress(event)}
                >
                  <View style={styles.resultContent}>
                    <Text
                      style={[styles.resultTitle, { color: theme.colors.text }]}
                    >
                      {event.title}
                    </Text>
                    <Text
                      style={[
                        styles.resultCategory,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {event.company}
                    </Text>
                    <Text
                      style={[
                        styles.resultDescription,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {event.description.substring(0, 100)}...
                    </Text>
                    <View style={styles.resultMeta}>
                      <Text
                        style={[
                          styles.resultRating,
                          { color: theme.colors.accent },
                        ]}
                      >
                        👍 {event.likes} like-uri
                      </Text>
                      <Text
                        style={[
                          styles.resultScore,
                          { color: theme.colors.textTertiary },
                        ]}
                      >
                        Relevanță: {Math.round(event.relevance_score * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    },
    [theme, handleRestaurantPress, handleEventPress]
  );

  const renderMenuRecommendations = useCallback(
    (recommendations: MenuRecommendation[]) => {
      return (
        <View style={styles.recommendationsContainer}>
          <View style={styles.recommendationsHeader}>
            <Ionicons
              name="restaurant-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              style={[
                styles.recommendationsTitle,
                { color: theme.colors.primary },
              ]}
            >
              Menu Recommendations
            </Text>
          </View>
          {recommendations.map((rec, index) => (
            <View
              key={index}
              style={[
                styles.recommendationCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border + "30",
                },
              ]}
            >
              <View style={styles.recommendationHeader}>
                <Text style={[styles.dishName, { color: theme.colors.text }]}>
                  {rec.dishName}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: theme.colors.primary + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {rec.category}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.dishDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {rec.description}
              </Text>

              <Text
                style={[
                  styles.recommendationReason,
                  { color: theme.colors.text },
                ]}
              >
                <Ionicons
                  name="bulb-outline"
                  size={16}
                  color={theme.colors.accent}
                />{" "}
                {rec.reason}
              </Text>

              {rec.estimatedPrice && (
                <Text
                  style={[
                    styles.priceInfo,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  Price: {rec.estimatedPrice}
                </Text>
              )}
            </View>
          ))}
        </View>
      );
    },
    [theme]
  );

  const renderMessage = useCallback(
    (message: Message) => {
      if (message.isLoading) {
        return (
          <View
            key={message.id}
            style={[styles.messageContainer, styles.aiMessageContainer]}
          >
            <View
              style={[
                styles.messageBubble,
                styles.aiMessageBubble,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.typingIndicator}>
                <Animated.View
                  style={[
                    styles.typingDot,
                    {
                      opacity: typingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.typingDot,
                    {
                      opacity: typingAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 1, 0.3],
                      }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.typingDot,
                    {
                      opacity: typingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.3],
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      }

      return (
        <Animated.View
          key={message.id}
          style={[
            styles.messageContainer,
            message.isUser
              ? styles.userMessageContainer
              : styles.aiMessageContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              message.isUser
                ? styles.userMessageBubble
                : styles.aiMessageBubble,
              {
                backgroundColor: message.isUser
                  ? theme.colors.accent
                  : message.error
                  ? theme.colors.error
                  : theme.colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.messageText,
                {
                  color: message.isUser
                    ? theme.colors.text
                    : message.error
                    ? theme.colors.text
                    : theme.colors.text,
                },
              ]}
            >
              {message.text}
            </Text>

            {message.intent && (
              <View style={styles.intentContainer}>
                <Text
                  style={[
                    styles.intentText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {getIntentIcon(message.intent)} {message.intent}
                </Text>
                {message.processingTime && (
                  <Text
                    style={[
                      styles.processingTime,
                      { color: theme.colors.textTertiary },
                    ]}
                  >
                    ({Math.round(message.processingTime * 1000)}ms)
                  </Text>
                )}
              </View>
            )}

            {message.searchResults &&
              renderSearchResults(message.searchResults)}

            {message.recommendations &&
              renderMenuRecommendations(message.recommendations)}
          </View>

          <Text
            style={[styles.timestampText, { color: theme.colors.textTertiary }]}
          >
            {formatTime(message.timestamp)}
          </Text>
        </Animated.View>
      );
    },
    [
      theme,
      fadeAnim,
      slideAnim,
      typingAnim,
      formatTime,
      getIntentIcon,
      renderSearchResults,
      renderMenuRecommendations,
    ]
  );

  const renderSuggestion = useCallback(
    (suggestion: Suggestion) => (
      <TouchableOpacity
        key={suggestion.id}
        style={[
          styles.suggestionButton,
          { backgroundColor: theme.colors.surface },
        ]}
        onPress={() => handleSuggestionPress(suggestion)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.colors.primary + "20", theme.colors.secondary + "20"]}
          style={styles.suggestionGradient}
        >
          <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
          <Text style={[styles.suggestionText, { color: theme.colors.text }]}>
            {suggestion.text}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    ),
    [theme, handleSuggestionPress]
  );

  const renderSystemStatus = useCallback(() => {
    if (!systemHealth && !connectionError) return null;

    const isHealthy = systemHealth?.status === "healthy";
    const statusColor = isHealthy
      ? theme.colors.success
      : connectionError
      ? theme.colors.error
      : theme.colors.warning;

    return (
      <View
        style={[styles.systemStatus, { backgroundColor: statusColor + "20" }]}
      >
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isHealthy
              ? "Smart AI activ"
              : connectionError
              ? "Problemă de conexiune"
              : "Status necunoscut"}
          </Text>
        </View>
        {systemHealth?.ai_system?.data_cache && (
          <Text
            style={[styles.statusDetail, { color: theme.colors.textSecondary }]}
          >
            {systemHealth.ai_system.data_cache.restaurants_count} restaurante,{" "}
            {systemHealth.ai_system.data_cache.events_count} evenimente
          </Text>
        )}
      </View>
    );
  }, [systemHealth, connectionError, theme]);

  return (
    <UniversalScreen
      style={StyleSheet.flatten([
        styles.container,
        { backgroundColor: theme.colors.primary },
      ])}
    >
      <StatusBar barStyle={theme.statusBarStyle} />

      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Smart AI Assistant
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              {isTyping
                ? "Se gândește..."
                : connectionError
                ? "Offline"
                : "Online și inteligent"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setShowSuggestions(!showSuggestions)}
          >
            <MaterialIcons
              name={showSuggestions ? "lightbulb" : "lightbulb-outline"}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerAction}
            onPress={checkSystemHealth}
          >
            <Ionicons name="refresh" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {renderSystemStatus()}
      </LinearGradient>

      {/* Chat Container with proper tab spacing */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: TAB_BAR_HEIGHT + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
        </ScrollView>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Animated.View
            style={[
              styles.suggestionsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {suggestions.map(renderSuggestion)}
            </ScrollView>
          </Animated.View>
        )}

        {/* Input Area with enhanced error handling */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surface,
              marginBottom: TAB_BAR_HEIGHT,
            },
          ]}
        >
          {/* Input Error Display */}
          {inputError && (
            <View
              style={[
                styles.errorContainer,
                {
                  borderColor: theme.colors.error,
                },
              ]}
            >
              <Ionicons name="warning" size={16} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {inputError}
              </Text>
              <TouchableOpacity
                onPress={() => setInputError("")}
                style={styles.errorClose}
              >
                <Ionicons name="close" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.surface,
                borderColor: inputError
                  ? theme.colors.error
                  : inputText.length > 1000
                  ? theme.colors.warning
                  : "transparent",
                borderWidth: inputError || inputText.length > 1000 ? 1 : 0,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: theme.colors.text }]}
              placeholder={
                company
                  ? "Întreabă-mă despre meniu, opțiuni dietetice sau recomandări de feluri de mâncare..."
                  : "Întreabă-mă orice despre restaurante și evenimente..."
              }
              placeholderTextColor={theme.colors.textSecondary}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (inputError) setInputError(""); // Clear error on typing
              }}
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={() => {
                if (!isLoading && inputText.trim()) {
                  sendMessage(inputText);
                }
              }}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    inputText.trim() && !isLoading && !inputError
                      ? theme.colors.accent
                      : theme.colors.surface,
                  opacity:
                    inputText.trim() && !isLoading && !inputError ? 1 : 0.5,
                },
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim() || !!inputError}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={
                    inputText.trim() && !inputError
                      ? theme.colors.text
                      : theme.colors.textTertiary
                  }
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Character count */}
          <Text
            style={[
              styles.characterCount,
              {
                color:
                  inputText.length > 1000
                    ? theme.colors.error
                    : inputText.length > 900
                    ? theme.colors.warning
                    : theme.colors.textTertiary,
              },
            ]}
          >
            {inputText.length}/1000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </UniversalScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginLeft: 8,
  },
  systemStatus: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusDetail: {
    fontSize: 11,
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: width * 0.85,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userMessageBubble: {
    borderBottomRightRadius: 6,
  },
  aiMessageBubble: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  intentContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  intentText: {
    fontSize: 12,
    fontWeight: "500",
  },
  processingTime: {
    fontSize: 10,
    fontStyle: "italic",
  },
  searchResultsContainer: {
    marginTop: 12,
  },
  resultSection: {
    marginBottom: 16,
  },
  resultSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  resultCategory: {
    fontSize: 12,
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultRating: {
    fontSize: 12,
    fontWeight: "500",
  },
  resultScore: {
    fontSize: 10,
  },
  timestampText: {
    fontSize: 12,
    marginHorizontal: 16,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6C3AFF",
    marginHorizontal: 2,
  },
  suggestionsContainer: {
    paddingVertical: 16,
  },
  suggestionsContent: {
    paddingHorizontal: 16,
  },
  suggestionButton: {
    marginRight: 12,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  // Menu Recommendations Styles
  recommendationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  recommendationCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dishName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  dishDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  recommendationReason: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 4,
  },
  priceInfo: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Error handling styles
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  errorClose: {
    padding: 4,
    marginLeft: 8,
  },
  characterCount: {
    fontSize: 10,
    textAlign: "right",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
});

export default AIChatScreen;
