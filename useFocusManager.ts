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