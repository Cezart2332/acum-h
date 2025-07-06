# React Native TextInput Focus Issues - Analysis & Solution

## Problem Analysis

### Issue 1: Focus disappears after ~1 second
This typically occurs due to:
- **Component re-renders**: The parent component re-renders, causing TextInput to lose focus
- **Ref instability**: useRef not properly maintained across renders
- **Platform quirks**: Android keyboard behavior interfering with focus
- **State updates**: Other state changes triggering unwanted re-renders

### Issue 2: Multiple inputs gain focus simultaneously
This happens because:
- **No focus coordination**: Inputs don't communicate focus state
- **Missing blur logic**: No automatic blur when another input gains focus
- **Race conditions**: Rapid tapping doesn't properly handle focus transitions

## Root Causes in Your Code

```tsx
// Issues in the original code:
export default function RegisterScreen() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  return (
    <View>
      <TextInput
        ref={emailRef}
        placeholder="Email"
        onFocus={() => console.log('Email focused')} // No focus management
      />
      <TextInput
        ref={passwordRef}
        placeholder="Password"
        onFocus={() => console.log('Password focused')} // No coordination
      />
    </View>
  );
}
```

**Problems:**
1. No state to track which input is currently focused
2. No blur coordination between inputs
3. Missing `onBlur` handlers
4. No prevention of simultaneous focus
5. Inline functions in `onFocus` could cause re-renders

## Complete Solution

### 1. Enhanced RegisterScreen with Proper Focus Management

```tsx
// RegisterScreen.tsx
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
```

### 2. Reusable Custom Hook for Focus Management

```tsx
// hooks/useFocusManager.ts
import { useRef, useState, useCallback } from 'react';
import { TextInput } from 'react-native';

export interface FocusManager<T extends string> {
  refs: Record<T, React.RefObject<TextInput>>;
  focusedInput: T | null;
  handleFocus: (inputName: T) => void;
  handleBlur: (inputName: T) => void;
  focusInput: (inputName: T) => void;
  blurAll: () => void;
}

export function useFocusManager<T extends string>(
  inputNames: readonly T[]
): FocusManager<T> {
  // Create refs for all inputs
  const refs = inputNames.reduce((acc, name) => {
    acc[name] = useRef<TextInput>(null);
    return acc;
  }, {} as Record<T, React.RefObject<TextInput>>);
  
  const [focusedInput, setFocusedInput] = useState<T | null>(null);
  
  const handleFocus = useCallback((inputName: T) => {
    // Blur other inputs when one gains focus
    if (focusedInput && focusedInput !== inputName) {
      refs[focusedInput].current?.blur();
    }
    
    setFocusedInput(inputName);
  }, [focusedInput, refs]);
  
  const handleBlur = useCallback((inputName: T) => {
    if (focusedInput === inputName) {
      setFocusedInput(null);
    }
  }, [focusedInput]);
  
  const focusInput = useCallback((inputName: T) => {
    refs[inputName].current?.focus();
  }, [refs]);
  
  const blurAll = useCallback(() => {
    inputNames.forEach(name => {
      refs[name].current?.blur();
    });
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
```

### 3. RegisterScreen Using the Custom Hook

```tsx
// RegisterScreen.tsx (Refactored with custom hook)
import React, { useCallback } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { useFocusManager } from './hooks/useFocusManager';

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
```

## Key Improvements

### 1. **Prevents Focus Loss**
- Stable refs using `useRef`
- Memoized handlers with `useCallback`
- State-driven focus management
- No unnecessary re-renders

### 2. **Prevents Simultaneous Focus**
- Automatic blur of other inputs when one gains focus
- Centralized focus state management
- Race condition prevention

### 3. **Better UX**
- Visual feedback for focused state
- Smooth keyboard navigation
- Proper return key handling

### 4. **Performance Optimized**
- Memoized callbacks prevent re-renders
- Stable refs across renders
- Efficient state updates

## Additional Best Practices

### Platform-Specific Considerations

```tsx
// For Android keyboard issues
import { Platform } from 'react-native';

const androidKeyboardProps = Platform.OS === 'android' ? {
  blurOnSubmit: false,
  autoCorrect: false,
} : {};

<TextInput
  {...androidKeyboardProps}
  // ... other props
/>
```

### Keyboard Avoidance

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={styles.container}
>
  {/* Your TextInputs */}
</KeyboardAvoidingView>
```

This solution addresses both focus issues while providing a scalable, reusable approach for managing TextInput focus in React Native applications.