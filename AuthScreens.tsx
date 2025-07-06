import React, { useRef, useState, useCallback } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

// Types for focus management
type LoginInputs = 'email' | 'password';
type RegisterInputs = 'email' | 'password' | 'confirmPassword';

// Reusable hook for focus management
function useFocusManager<T extends string>(inputNames: T[]) {
  const refs = inputNames.reduce((acc, name) => {
    acc[name] = useRef<TextInput>(null);
    return acc;
  }, {} as Record<T, React.RefObject<TextInput>>);
  
  const [focusedInput, setFocusedInput] = useState<T | null>(null);
  
  const handleFocus = useCallback((inputName: T) => {
    // Blur other inputs when one gains focus (prevents simultaneous focus)
    if (focusedInput && focusedInput !== inputName) {
      refs[focusedInput].current?.blur();
    }
    setFocusedInput(inputName);
  }, [focusedInput, refs]);
  
  const handleBlur = useCallback((inputName: T) => {
    // Only clear focus state if this input was actually focused
    if (focusedInput === inputName) {
      setFocusedInput(null);
    }
  }, [focusedInput]);
  
  const focusInput = useCallback((inputName: T) => {
    refs[inputName].current?.focus();
  }, [refs]);
  
  const blurAll = useCallback(() => {
    inputNames.forEach(name => refs[name].current?.blur());
    setFocusedInput(null);
  }, [refs, inputNames]);
  
  return {
    refs,
    focusedInput,
    handleFocus,
    handleBlur,
    focusInput,
    blurAll,
  };
}

// LoginScreen Component
export function LoginScreen() {
  const {
    refs,
    focusedInput,
    handleFocus,
    handleBlur,
    focusInput,
  } = useFocusManager<LoginInputs>(['email', 'password']);
  
  // Stable handlers to prevent re-renders
  const handleEmailFocus = useCallback(() => handleFocus('email'), [handleFocus]);
  const handleEmailBlur = useCallback(() => handleBlur('email'), [handleBlur]);
  const handlePasswordFocus = useCallback(() => handleFocus('password'), [handleFocus]);
  const handlePasswordBlur = useCallback(() => handleBlur('password'), [handleBlur]);
  
  const handleLogin = useCallback(() => {
    console.log('Login pressed');
    // Blur all inputs on form submission
    refs.email.current?.blur();
    refs.password.current?.blur();
  }, [refs]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Login</Text>
        
        <TextInput
          ref={refs.email}
          placeholder="Email"
          style={[
            styles.input,
            focusedInput === 'email' && styles.inputFocused
          ]}
          onFocus={handleEmailFocus}
          onBlur={handleEmailBlur}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          autoCorrect={false}
          onSubmitEditing={() => focusInput('password')}
        />
        
        <TextInput
          ref={refs.password}
          placeholder="Password"
          style={[
            styles.input,
            focusedInput === 'password' && styles.inputFocused
          ]}
          onFocus={handlePasswordFocus}
          onBlur={handlePasswordBlur}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// RegisterScreen Component
export function RegisterScreen() {
  const {
    refs,
    focusedInput,
    handleFocus,
    handleBlur,
    focusInput,
  } = useFocusManager<RegisterInputs>(['email', 'password', 'confirmPassword']);
  
  // Stable handlers to prevent re-renders
  const handleEmailFocus = useCallback(() => handleFocus('email'), [handleFocus]);
  const handleEmailBlur = useCallback(() => handleBlur('email'), [handleBlur]);
  const handlePasswordFocus = useCallback(() => handleFocus('password'), [handleFocus]);
  const handlePasswordBlur = useCallback(() => handleBlur('password'), [handleBlur]);
  const handleConfirmPasswordFocus = useCallback(() => handleFocus('confirmPassword'), [handleFocus]);
  const handleConfirmPasswordBlur = useCallback(() => handleBlur('confirmPassword'), [handleBlur]);
  
  const handleRegister = useCallback(() => {
    console.log('Register pressed');
    // Blur all inputs on form submission
    refs.email.current?.blur();
    refs.password.current?.blur();
    refs.confirmPassword.current?.blur();
  }, [refs]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Register</Text>
        
        <TextInput
          ref={refs.email}
          placeholder="Email"
          style={[
            styles.input,
            focusedInput === 'email' && styles.inputFocused
          ]}
          onFocus={handleEmailFocus}
          onBlur={handleEmailBlur}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          autoCorrect={false}
          onSubmitEditing={() => focusInput('password')}
        />
        
        <TextInput
          ref={refs.password}
          placeholder="Password"
          style={[
            styles.input,
            focusedInput === 'password' && styles.inputFocused
          ]}
          onFocus={handlePasswordFocus}
          onBlur={handlePasswordBlur}
          secureTextEntry
          returnKeyType="next"
          onSubmitEditing={() => focusInput('confirmPassword')}
        />
        
        <TextInput
          ref={refs.confirmPassword}
          placeholder="Confirm Password"
          style={[
            styles.input,
            focusedInput === 'confirmPassword' && styles.inputFocused
          ]}
          onFocus={handleConfirmPasswordFocus}
          onBlur={handleConfirmPasswordBlur}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />
        
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

// Default export with both components
export default {
  LoginScreen,
  RegisterScreen,
};