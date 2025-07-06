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
  searchResults?: any;
  isLoading?: boolean;
  error?: boolean;
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
  search_results: any;
  processing_time: number;
  timestamp: string;
  error?: string;
}

const AIChatScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize welcome message and suggestions
    initializeChat();
    
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

  const initializeChat = async () => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      text: 'Bună ziua! 👋 Sunt asistentul tău AI pentru restaurante și evenimente. Cu ce te pot ajuta astăzi?',
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
        };

        setMessages(prev => prev.slice(0, -1).concat([aiMessage]));
        
        // Haptic feedback for successful response
        Vibration.vibrate(50);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Îmi pare rău, am întâmpinat o problemă tehnică. Te rog să încerci din nou.',
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
             </View>
          )}
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
               AI Assistant
             </Text>
             <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
               {isTyping ? 'Se gândește...' : 'Online'}
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
        </View>
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
    maxWidth: width * 0.8,
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
  },
  intentText: {
    fontSize: 12,
    fontWeight: '500',
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