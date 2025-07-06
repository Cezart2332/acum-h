import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AI_BASE_URL } from '../config';

const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  intent?: string;
  searchResults?: SearchResults;
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

const AIChatScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize welcome message and suggestions
    initializeChat();
    
    // Check system health
    checkSystemHealth();
    
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
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${AI_BASE_URL}/health`);
      const health: SystemHealth = await response.json();
      setSystemHealth(health);
      setConnectionError(false);
    } catch (error) {
      console.warn('Failed to check system health:', error);
      setConnectionError(true);
    }
  };

  const initializeChat = async () => {
    // Add welcome message with system info
    const welcomeMessage: Message = {
      id: 'welcome',
      text: 'Bună ziua! 👋 Sunt asistentul tău AI pentru restaurante și evenimente cu suport îmbunătățit pentru backend-ul C#. Cu ce te pot ajuta astăzi?',
      isUser: false,
      timestamp: new Date(),
      intent: 'greeting'
    };
    
    setMessages([welcomeMessage]);
    
    // Load suggestions
    try {
      const response = await fetch(`${AI_BASE_URL}/chat/suggestions`);
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.warn('Failed to load suggestions:', error);
      // Fallback suggestions
      setSuggestions([
        { id: 1, text: 'Salut! Cum te cheamă?', category: 'greeting', icon: '👋' },
        { id: 2, text: 'Recomanzi-mi un restaurant italian', category: 'restaurant', icon: '🍝' },
        { id: 3, text: 'Vreau să mănânc pizza', category: 'food', icon: '🍕' },
        { id: 4, text: 'Ce evenimente sunt în weekend?', category: 'events', icon: '🎉' },
        { id: 5, text: 'Ce companii sunt în zona mea?', category: 'location', icon: '🏢' },
        { id: 6, text: 'Arată-mi meniul pentru restaurantul X', category: 'menu', icon: '📋' },
      ]);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: Date.now().toString() + '_loading',
      text: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputText('');
    setIsLoading(true);
    setShowSuggestions(false);
    setIsTyping(true);

    // Start typing animation
    Animated.loop(
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
    ).start();

    try {
      const response = await fetch(`${AI_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: text.trim(),
          user_id: 'react_native_user',
        }),
      });

      const data: ChatResponse = await response.json();

      // Stop typing animation
      typingAnim.stopAnimation();
      setIsTyping(false);

      if (data.success) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date(),
          intent: data.intent,
          searchResults: data.search_results,
          processingTime: data.metadata?.response_time,
        };

        setMessages(prev => prev.slice(0, -1).concat([aiMessage]));
        
        // Haptic feedback for successful response
        Vibration.vibrate(50);
        
        // Clear connection error if request was successful
        setConnectionError(false);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Check if it's a connection error
      const isConnectionError = error instanceof TypeError && error.message.includes('Network request failed');
      setConnectionError(isConnectionError);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: isConnectionError 
          ? 'Nu pot să mă conectez la serverul AI. Te rog verifică conexiunea și încearcă din nou.'
          : 'Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou.',
        isUser: false,
        timestamp: new Date(),
        error: true,
      };

      setMessages(prev => prev.slice(0, -1).concat([errorMessage]));
      
      // Haptic feedback for error
      Vibration.vibrate([100, 50, 100]);
    } finally {
      setIsLoading(false);
      typingAnim.stopAnimation();
      setIsTyping(false);
    }
  };

  const handleSuggestionPress = (suggestion: Suggestion) => {
    sendMessage(suggestion.text);
  };

  const handleRestaurantPress = (restaurant: Restaurant) => {
    Alert.alert(
      restaurant.name,
      `${restaurant.description}\n\nCategorie: ${restaurant.category}\nAdresă: ${restaurant.address}\nRating: ${restaurant.rating}/5\n\nDorești să vezi mai multe detalii?`,
      [
        { text: 'Anulează', style: 'cancel' },
        { text: 'Vezi meniul', onPress: () => getRestaurantMenu(restaurant.id) },
        { text: 'Detalii complete', onPress: () => getRestaurantDetails(restaurant.id) },
      ]
    );
  };

  const handleEventPress = (event: Event) => {
    Alert.alert(
      event.title,
      `${event.description}\n\nOrganizator: ${event.company}\nLike-uri: ${event.likes}\n\nDorești să vezi detalii complete?`,
      [
        { text: 'Anulează', style: 'cancel' },
        { text: 'Vezi detalii', onPress: () => getEventDetails(event.id) },
      ]
    );
  };

  const getRestaurantMenu = async (restaurantId: number) => {
    try {
      const response = await fetch(`${AI_BASE_URL}/companies/${restaurantId}/menu`);
      if (response.ok) {
        Alert.alert('Succes', 'Meniul este disponibil pentru descărcare!');
        // Here you could implement PDF viewing or download
      } else {
        Alert.alert('Info', 'Meniul nu este disponibil pentru acest restaurant.');
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu am putut să accesez meniul.');
    }
  };

  const getRestaurantDetails = async (restaurantId: number) => {
    try {
      const response = await fetch(`${AI_BASE_URL}/companies/details/${restaurantId}`);
      const data = await response.json();
      if (data.success) {
        const company = data.company;
        Alert.alert(
          company.name,
          `Descriere: ${company.description}\nCategorie: ${company.category}\nAdresă: ${company.address}\nContact: ${company.contact}\nCUI: ${company.cui}\nLatitudine: ${company.latitude}\nLongitudine: ${company.longitude}\n\nEvenimente active: ${company.events?.length || 0}`
        );
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu am putut să accesez detaliile restaurantului.');
    }
  };

  const getEventDetails = async (eventId: number) => {
    try {
      const response = await fetch(`${AI_BASE_URL}/events/details/${eventId}`);
      const data = await response.json();
      if (data.success) {
        const event = data.event;
        Alert.alert(
          event.title,
          `Descriere: ${event.description}\nCompanie: ${event.company}\nLike-uri: ${event.likes}\nTags: ${event.tags?.join(', ') || 'Nu sunt disponibile'}`
        );
      }
    } catch (error) {
      Alert.alert('Eroare', 'Nu am putut să accesez detaliile evenimentului.');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSearchResults = (searchResults: SearchResults) => {
    if (!searchResults || (!searchResults.restaurants?.length && !searchResults.events?.length)) {
      return null;
    }

    return (
      <View style={styles.searchResultsContainer}>
        {searchResults.restaurants && searchResults.restaurants.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={[styles.resultSectionTitle, { color: theme.colors.text }]}>
              🍽️ Restaurante ({searchResults.restaurants.length})
            </Text>
            {searchResults.restaurants.slice(0, 3).map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                style={[styles.resultItem, { backgroundColor: theme.colors.surface }]}
                onPress={() => handleRestaurantPress(restaurant)}
              >
                <View style={styles.resultContent}>
                  <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                    {restaurant.name}
                  </Text>
                  <Text style={[styles.resultCategory, { color: theme.colors.textSecondary }]}>
                    {restaurant.category}
                  </Text>
                  <Text style={[styles.resultDescription, { color: theme.colors.textSecondary }]}>
                    {restaurant.description.substring(0, 100)}...
                  </Text>
                  <View style={styles.resultMeta}>
                    <Text style={[styles.resultRating, { color: theme.colors.accent }]}>
                      ⭐ {restaurant.rating}/5
                    </Text>
                    <Text style={[styles.resultScore, { color: theme.colors.textTertiary }]}>
                      Relevanță: {Math.round(restaurant.relevance_score * 100)}%
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {searchResults.events && searchResults.events.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={[styles.resultSectionTitle, { color: theme.colors.text }]}>
              🎉 Evenimente ({searchResults.events.length})
            </Text>
            {searchResults.events.slice(0, 3).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.resultItem, { backgroundColor: theme.colors.surface }]}
                onPress={() => handleEventPress(event)}
              >
                <View style={styles.resultContent}>
                  <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.resultCategory, { color: theme.colors.textSecondary }]}>
                    {event.company}
                  </Text>
                  <Text style={[styles.resultDescription, { color: theme.colors.textSecondary }]}>
                    {event.description.substring(0, 100)}...
                  </Text>
                  <View style={styles.resultMeta}>
                    <Text style={[styles.resultRating, { color: theme.colors.accent }]}>
                      👍 {event.likes} like-uri
                    </Text>
                    <Text style={[styles.resultScore, { color: theme.colors.textTertiary }]}>
                      Relevanță: {Math.round(event.relevance_score * 100)}%
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderMessage = (message: Message) => {
    if (message.isLoading) {
      return (
        <View key={message.id} style={[styles.messageContainer, styles.aiMessageContainer]}>
          <View style={[styles.messageBubble, styles.aiMessageBubble, { backgroundColor: theme.colors.surface }]}>
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
          message.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            message.isUser ? styles.userMessageBubble : styles.aiMessageBubble,
            {
              backgroundColor: message.isUser
                ? theme.colors.primary
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
              <Text style={[styles.intentText, { color: theme.colors.textSecondary }]}>
                {getIntentIcon(message.intent)} {message.intent}
              </Text>
              {message.processingTime && (
                <Text style={[styles.processingTime, { color: theme.colors.textTertiary }]}>
                  ({Math.round(message.processingTime * 1000)}ms)
                </Text>
              )}
            </View>
          )}
          
          {message.searchResults && renderSearchResults(message.searchResults)}
        </View>
        
        <Text style={[styles.timestampText, { color: theme.colors.textTertiary }]}>
          {formatTime(message.timestamp)}
        </Text>
      </Animated.View>
    );
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'greeting': return '👋';
      case 'restaurant_search': return '🍽️';
      case 'food_search': return '🍕';
      case 'event_search': return '🎉';
      case 'recommendation': return '⭐';
      case 'price_inquiry': return '💰';
      case 'location_search': return '📍';
      default: return '💬';
    }
  };

  const renderSuggestion = (suggestion: Suggestion) => (
    <TouchableOpacity
      key={suggestion.id}
      style={[styles.suggestionButton, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleSuggestionPress(suggestion)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[theme.colors.primary + '20', theme.colors.secondary + '20']}
        style={styles.suggestionGradient}
      >
        <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
        <Text style={[styles.suggestionText, { color: theme.colors.text }]}>
          {suggestion.text}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSystemStatus = () => {
    if (!systemHealth && !connectionError) return null;

    const isHealthy = systemHealth?.status === 'healthy' && systemHealth?.ai_system?.backend_connection === 'healthy';
    const statusColor = isHealthy ? theme.colors.success : connectionError ? theme.colors.error : theme.colors.warning;

    return (
      <View style={[styles.systemStatus, { backgroundColor: statusColor + '20' }]}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isHealthy ? 'AI Backend activ' : connectionError ? 'Problemă de conexiune' : 'Status necunoscut'}
          </Text>
        </View>
        {systemHealth?.ai_system?.data_cache && (
          <Text style={[styles.statusDetail, { color: theme.colors.textSecondary }]}>
            {systemHealth.ai_system.data_cache.restaurants_count} restaurante, {systemHealth.ai_system.data_cache.events_count} evenimente
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar barStyle={theme.statusBarStyle} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              AI Assistant (Backend)
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {isTyping ? 'Se gândește...' : connectionError ? 'Offline' : 'Online'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => setShowSuggestions(!showSuggestions)}
          >
            <MaterialIcons 
              name={showSuggestions ? 'lightbulb' : 'lightbulb-outline'} 
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

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
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

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: theme.colors.text }]}
              placeholder="Scrie un mesaj..."
              placeholderTextColor={theme.colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() ? theme.colors.accent : theme.colors.surface,
                },
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? theme.colors.text : theme.colors.textTertiary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 8,
  },
  systemStatus: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.85,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
    shadowColor: '#000',
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
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intentText: {
    fontSize: 12,
    fontWeight: '500',
  },
  processingTime: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  searchResultsContainer: {
    marginTop: 12,
  },
  resultSection: {
    marginBottom: 16,
  },
  resultSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultRating: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultScore: {
    fontSize: 10,
  },
  timestampText: {
    fontSize: 12,
    marginHorizontal: 16,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C3AFF',
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default AIChatScreen;