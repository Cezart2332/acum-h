import React, { useRef, useState, useCallback } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';

type FocusedInput = 'email' | 'password' | null;

export default function RegisterScreen() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  
  // Track which input is currently focused
  const [focusedInput, setFocusedInput] = useState<FocusedInput>(null);
  
  // Prevent multiple simultaneous focus
  const handleFocus = useCallback((inputName: FocusedInput) => {
    // Blur other inputs when one gains focus
    if (focusedInput && focusedInput !== inputName) {
      if (focusedInput === 'email' && emailRef.current) {
        emailRef.current.blur();
      } else if (focusedInput === 'password' && passwordRef.current) {
        passwordRef.current.blur();
      }
    }
    
    setFocusedInput(inputName);
    console.log(`${inputName} focused`);
  }, [focusedInput]);
  
  const handleBlur = useCallback((inputName: FocusedInput) => {
    // Only clear focus state if this input was actually focused
    if (focusedInput === inputName) {
      setFocusedInput(null);
    }
    console.log(`${inputName} blurred`);
  }, [focusedInput]);
  
  // Specific handlers for each input
  const handleEmailFocus = useCallback(() => handleFocus('email'), [handleFocus]);
  const handleEmailBlur = useCallback(() => handleBlur('email'), [handleBlur]);
  const handlePasswordFocus = useCallback(() => handleFocus('password'), [handleFocus]);
  const handlePasswordBlur = useCallback(() => handleBlur('password'), [handleBlur]);

  return (
    <View style={styles.container}>
      <TextInput
        ref={emailRef}
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
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextInput
        ref={passwordRef}
        placeholder="Password"
        style={[
          styles.input,
          focusedInput === 'password' && styles.inputFocused
        ]}
        onFocus={handlePasswordFocus}
        onBlur={handlePasswordBlur}
        secureTextEntry
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
});