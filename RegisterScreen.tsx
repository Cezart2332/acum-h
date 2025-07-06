import React, { useCallback } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { useFocusManager } from './useFocusManager';

const INPUT_NAMES = ['email', 'password'] as const;
type InputName = typeof INPUT_NAMES[number];

export default function RegisterScreen() {
  const {
    refs,
    focusedInput,
    handleFocus,
    handleBlur,
    focusInput,
  } = useFocusManager(INPUT_NAMES);
  
  // Create stable handlers for each input
  const createFocusHandler = useCallback(
    (inputName: InputName) => () => handleFocus(inputName),
    [handleFocus]
  );
  
  const createBlurHandler = useCallback(
    (inputName: InputName) => () => handleBlur(inputName),
    [handleBlur]
  );

  return (
    <View style={styles.container}>
      <TextInput
        ref={refs.email}
        placeholder="Email"
        style={[
          styles.input,
          focusedInput === 'email' && styles.inputFocused
        ]}
        onFocus={createFocusHandler('email')}
        onBlur={createBlurHandler('email')}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => focusInput('password')}
      />
      <TextInput
        ref={refs.password}
        placeholder="Password"
        style={[
          styles.input,
          focusedInput === 'password' && styles.inputFocused
        ]}
        onFocus={createFocusHandler('password')}
        onBlur={createBlurHandler('password')}
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