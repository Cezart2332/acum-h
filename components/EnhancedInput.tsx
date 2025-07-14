import React, { useState, useRef, useCallback } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { 
  getResponsiveFontSize, 
  TYPOGRAPHY, 
  getResponsiveSpacing,
  getShadow,
  hapticFeedback 
} from '../utils/responsive';

interface EnhancedInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  showPasswordToggle?: boolean;
  required?: boolean;
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  showPasswordToggle = false,
  required = false,
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef<TextInput>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.();
  }, [animatedValue, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.();
  }, [animatedValue, onBlur]);

  const toggleSecureText = useCallback(() => {
    hapticFeedback('light');
    setIsSecure(!isSecure);
  }, [isSecure]);

  const handleRightIconPress = useCallback(() => {
    hapticFeedback('light');
    if (showPasswordToggle) {
      toggleSecureText();
    } else {
      onRightIconPress?.();
    }
  }, [showPasswordToggle, toggleSecureText, onRightIconPress]);

  // Add container press handler to focus input
  const handleContainerPress = useCallback(() => {
    if (editable && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editable]);

  const getBorderColor = () => {
    if (error) {
      return theme.colors.error;
    }
    if (isFocused) {
      return theme.colors.accent;
    }
    return theme.colors.border;
  };

  const getLabelColor = () => {
    if (error) {
      return theme.colors.error;
    }
    if (isFocused) {
      return theme.colors.accent;
    }
    return theme.colors.textSecondary;
  };

  const containerStyle = [
    styles.container,
    style,
  ];

  const inputContainerStyle = [
    styles.inputContainer,
    {
      borderColor: getBorderColor(),
      backgroundColor: theme.colors.surface,
      ...(isFocused && getShadow(2)),
    },
    multiline && { height: numberOfLines * 40 },
  ];

  const textInputStyle = [
    styles.textInput,
    {
      color: theme.colors.text,
      fontSize: TYPOGRAPHY.body,
    },
    inputStyle,
    multiline && styles.multilineInput,
  ];

  const labelStyle = [
    styles.label,
    {
      color: getLabelColor(),
      fontSize: TYPOGRAPHY.bodySmall,
    },
  ];

  const errorStyle = [
    styles.errorText,
    {
      color: theme.colors.error,
      fontSize: TYPOGRAPHY.caption,
    },
  ];

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={labelStyle}>
          {label}
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={inputContainerStyle}
        onPress={handleContainerPress}
        activeOpacity={1}
        accessible={false}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons
              name={leftIcon as any}
              size={20}
              color={isFocused ? theme.colors.accent : theme.colors.textTertiary}
            />
          </View>
        )}
        
        <TextInput
          ref={textInputRef}
          style={textInputStyle}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={showPasswordToggle ? isSecure : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoFocus={false}
          blurOnSubmit={!multiline}
          returnKeyType={multiline ? 'default' : 'done'}
          underlineColorAndroid="transparent"
          selectionColor={theme.colors.accent}
        />
        
        {(rightIcon || showPasswordToggle) && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={handleRightIconPress}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                showPasswordToggle
                  ? (isSecure ? 'eye-off-outline' : 'eye-outline')
                  : (rightIcon as any)
              }
              size={20}
              color={isFocused ? theme.colors.accent : theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      
      {error && <Text style={errorStyle}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: getResponsiveSpacing('md'),
  },
  label: {
    marginBottom: getResponsiveSpacing('sm'),
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: getResponsiveSpacing('md'),
    minHeight: Platform.OS === 'ios' ? 50 : 48,
    paddingVertical: Platform.OS === 'android' ? 4 : 0,
  },
  textInput: {
    flex: 1,
    paddingVertical: getResponsiveSpacing('sm'),
    fontSize: TYPOGRAPHY.body,
    minHeight: Platform.OS === 'ios' ? 40 : 36,
    textAlignVertical: 'center',
  },
  multilineInput: {
    paddingTop: getResponsiveSpacing('md'),
    textAlignVertical: 'top',
    minHeight: 80,
  },
  leftIconContainer: {
    marginRight: getResponsiveSpacing('sm'),
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
  rightIconContainer: {
    marginLeft: getResponsiveSpacing('sm'),
    padding: getResponsiveSpacing('xs'),
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  errorText: {
    marginTop: getResponsiveSpacing('xs'),
    marginLeft: getResponsiveSpacing('xs'),
  },
});

export default EnhancedInput;
