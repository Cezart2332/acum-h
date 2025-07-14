import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { 
  getResponsiveFontSize, 
  getShadow, 
  hapticFeedback, 
  TYPOGRAPHY,
  getResponsiveSpacing 
} from '../utils/responsive';

interface EnhancedButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: boolean;
  haptic?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  style,
  textStyle,
  gradient = false,
  haptic = true,
  icon,
  iconPosition = 'left',
}) => {
  const { theme } = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (haptic) {
      hapticFeedback('medium');
    }
    onPress();
  };

  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.accent,
          textColor: theme.colors.text,
          borderColor: theme.colors.accent,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.surface,
          textColor: theme.colors.text,
          borderColor: theme.colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: theme.colors.accent,
          borderColor: theme.colors.accent,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: theme.colors.accent,
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: theme.colors.accent,
          textColor: theme.colors.text,
          borderColor: theme.colors.accent,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: getResponsiveSpacing('md'),
          paddingVertical: getResponsiveSpacing('sm'),
          fontSize: TYPOGRAPHY.bodySmall,
        };
      case 'medium':
        return {
          paddingHorizontal: getResponsiveSpacing('lg'),
          paddingVertical: getResponsiveSpacing('md'),
          fontSize: TYPOGRAPHY.body,
        };
      case 'large':
        return {
          paddingHorizontal: getResponsiveSpacing('xl'),
          paddingVertical: getResponsiveSpacing('lg'),
          fontSize: TYPOGRAPHY.h6,
        };
      default:
        return {
          paddingHorizontal: getResponsiveSpacing('lg'),
          paddingVertical: getResponsiveSpacing('md'),
          fontSize: TYPOGRAPHY.body,
        };
    }
  };

  const colors = getButtonColors();
  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: isDisabled ? theme.colors.border : colors.backgroundColor,
      borderColor: isDisabled ? theme.colors.borderLight : colors.borderColor,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      paddingVertical: sizeStyles.paddingVertical,
      opacity: isDisabled ? 0.6 : 1,
    },
    fullWidth && styles.fullWidth,
    getShadow(4),
    style,
  ];

  const buttonTextStyle = [
    styles.buttonText,
    {
      color: isDisabled ? theme.colors.textTertiary : colors.textColor,
      fontSize: sizeStyles.fontSize,
    },
    textStyle,
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textColor} />
          <Text style={[buttonTextStyle, styles.loadingText]}>Loading...</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {icon && iconPosition === 'left' && (
          <View style={styles.iconLeft}>{icon}</View>
        )}
        <Text style={buttonTextStyle}>{title}</Text>
        {icon && iconPosition === 'right' && (
          <View style={styles.iconRight}>{icon}</View>
        )}
      </View>
    );
  };

  const renderButton = () => {
    if (gradient && variant === 'primary') {
      return (
        <LinearGradient
          colors={[theme.colors.accent, theme.colors.accentSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={buttonStyle}
        >
          {renderContent()}
        </LinearGradient>
      );
    }

    return <View style={buttonStyle}>{renderContent()}</View>;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={styles.touchable}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        {renderButton()}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    alignSelf: 'stretch',
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: getResponsiveSpacing('sm'),
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: getResponsiveSpacing('sm'),
  },
  iconRight: {
    marginLeft: getResponsiveSpacing('sm'),
  },
});

export default EnhancedButton;
