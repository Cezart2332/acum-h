import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
  colors: {
    // Background colors
    primary: string;
    secondary: string;
    surface: string;
    card: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;
    
    // Accent colors
    accent: string;
    accentSecondary: string;
    accentLight: string;
    
    // Status colors
    success: string;
    error: string;
    warning: string;
    info: string;
    
    // Border colors
    border: string;
    borderLight: string;
    
    // Special colors
    shadow: string;
    overlay: string;
    
    // Gradients
    gradientStart: string;
    gradientEnd: string;
    cardGradientStart: string;
    cardGradientEnd: string;
  };
  
  // Status bar style
  statusBarStyle: 'light-content' | 'dark-content';
  
  // Theme identifier
  name: 'dark' | 'light';
}

// Dark theme (black & violet)
export const darkTheme: Theme = {
  colors: {
    primary: '#0F0817',
    secondary: '#1A1A1A',
    surface: '#2A1A4A',
    card: '#1A1A1A',
    
    text: '#E0E0FF',
    textSecondary: '#A78BFA',
    textTertiary: '#8B5CF6',
    
    accent: '#6C3AFF',
    accentSecondary: '#9B59B6',
    accentLight: '#BB86FC',
    
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    border: '#2A1A4A',
    borderLight: '#4A2D75',
    
    shadow: '#6C3AFF',
    overlay: 'rgba(15,8,23,0.8)',
    
    gradientStart: '#0F0817',
    gradientEnd: '#1A1A1A',
    cardGradientStart: '#6C3AFF',
    cardGradientEnd: '#9B59B6',
  },
  statusBarStyle: 'light-content',
  name: 'dark',
};

// Light theme (white & purple)
export const lightTheme: Theme = {
  colors: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    surface: '#E2E8F0',
    card: '#FFFFFF',
    
    text: '#1E293B',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    
    accent: '#8B5CF6',
    accentSecondary: '#A855F7',
    accentLight: '#C4B5FD',
    
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    
    shadow: '#8B5CF6',
    overlay: 'rgba(255,255,255,0.9)',
    
    gradientStart: '#FFFFFF',
    gradientEnd: '#F8FAFC',
    cardGradientStart: '#8B5CF6',
    cardGradientEnd: '#A855F7',
  },
  statusBarStyle: 'dark-content',
  name: 'light',
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // Default to dark theme
  const [theme, setThemeState] = useState<Theme>(darkTheme);

  useEffect(() => {
    // Load theme preference from AsyncStorage
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          const isDarkTheme = savedTheme === 'dark';
          setIsDark(isDarkTheme);
          setThemeState(isDarkTheme ? darkTheme : lightTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    const newTheme = newIsDark ? darkTheme : lightTheme;
    setThemeState(newTheme);
    
    try {
      await AsyncStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setTheme = async (themeName: 'dark' | 'light') => {
    const newIsDark = themeName === 'dark';
    setIsDark(newIsDark);
    const newTheme = newIsDark ? darkTheme : lightTheme;
    setThemeState(newTheme);
    
    try {
      await AsyncStorage.setItem('theme', themeName);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Helper function to create themed styles
export const createThemedStyles = (theme: Theme) => ({
  // Common containers
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  
  // Cards
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Input fields
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 16,
  },
  
  // Buttons
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Text styles
  text: {
    color: theme.colors.text,
    fontSize: 16,
  },
  
  textSecondary: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // Gradient backgrounds
  gradient: {
    flex: 1,
  },
});

// Common gradient arrays for components
export const getGradients = (theme: Theme) => ({
  primary: [theme.colors.gradientStart, theme.colors.gradientEnd],
  accent: [theme.colors.cardGradientStart, theme.colors.cardGradientEnd],
  overlay: ['transparent', theme.colors.overlay],
});

export default ThemeContext;