import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './RootStackParamList';
import { useUser } from '../context/UserContext';
import { BASE_URL } from '../config';

const { width } = Dimensions.get('window');

type BugReportScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BugReport'
>;

interface Props {
  navigation: BugReportScreenNavigationProp;
}

const BugReportScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getDeviceInfo = () => {
    return {
      platform: Platform.OS,
      osVersion: Platform.Version,
      device: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
    };
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Eroare', 'Te rugăm să introduci un titlu pentru raportarea problemei.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Eroare', 'Te rugăm să descrii problema întâmpinată.');
      return false;
    }
    if (title.trim().length < 5) {
      Alert.alert('Eroare', 'Titlul trebuie să conțină cel puțin 5 caractere.');
      return false;
    }
    if (description.trim().length < 10) {
      Alert.alert('Eroare', 'Descrierea trebuie să conțină cel puțin 10 caractere.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const deviceInfo = getDeviceInfo();
      
      const bugReportData = {
        username: user?.email || 'Unknown',
        title: title.trim(),
        description: description.trim(),
        deviceType: deviceInfo.platform,
        deviceInfo: `${deviceInfo.device} - ${deviceInfo.platform} ${deviceInfo.osVersion}`,
      };

      const response = await fetch(`${BASE_URL}/api/BugReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bugReportData),
      });

      if (response.ok) {
        Alert.alert(
          'Succes!',
          'Raportarea problemei a fost trimisă cu succes. Îți mulțumim pentru feedback!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error('Failed to submit bug report');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert(
        'Eroare',
        'A apărut o problemă la trimiterea raportului. Te rugăm să încerci din nou.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#6C3AFF', '#9D4EDD']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Raportează o Problemă</Text>
          <Text style={styles.headerSubtitle}>
            Ajută-ne să îmbunătățim aplicația
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Bug Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#6C3AFF', '#9D4EDD', '#C77DFF']}
              style={styles.iconGradient}
            >
              <Ionicons name="bug-outline" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="text-outline" size={16} color="#B19CD9" /> Titlu
              </Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['#1A0B2E', '#2A1A4A']}
                  style={styles.inputGradient}
                >
                  <TextInput
                    style={styles.textInput}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Descrie pe scurt problema..."
                    placeholderTextColor="#666B8A"
                    maxLength={100}
                    editable={!isSubmitting}
                  />
                </LinearGradient>
                <Text style={styles.characterCount}>{title.length}/100</Text>
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="document-text-outline" size={16} color="#B19CD9" /> Descriere Detaliată
              </Text>
              <View style={styles.inputWrapper}>
                <LinearGradient
                  colors={['#1A0B2E', '#2A1A4A']}
                  style={[styles.inputGradient, styles.textAreaGradient]}
                >
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Descrie detaliat problema întâmpinată, pașii pentru a o reproduce și orice informații suplimentare relevante..."
                    placeholderTextColor="#666B8A"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={500}
                    editable={!isSubmitting}
                  />
                </LinearGradient>
                <Text style={styles.characterCount}>{description.length}/500</Text>
              </View>
            </View>

            {/* Device Info */}
            <View style={styles.deviceInfoContainer}>
              <Text style={styles.deviceInfoTitle}>
                <Ionicons name="phone-portrait-outline" size={16} color="#B19CD9" /> Informații Dispozitiv
              </Text>
              <View style={styles.deviceInfoCard}>
                <LinearGradient
                  colors={['#1A0B2E', '#2A1A4A']}
                  style={styles.deviceInfoGradient}
                >
                  <Text style={styles.deviceInfoText}>
                    Platformă: {Platform.OS === 'ios' ? 'iOS' : 'Android'}
                  </Text>
                  <Text style={styles.deviceInfoText}>
                    Versiune: {Platform.Version}
                  </Text>
                  <Text style={styles.deviceInfoSubtext}>
                    * Aceste informații vor fi incluse automat în raportul tău
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isSubmitting
                    ? ['#4A4A4A', '#666666']
                    : ['#6C3AFF', '#9D4EDD', '#C77DFF']
                }
                style={styles.submitButtonGradient}
              >
                {isSubmitting ? (
                  <View style={styles.submitButtonContent}>
                    <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Se trimite...</Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Trimite Raportul</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B19CD9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  content: {
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputWrapper: {
    gap: 6,
  },
  inputGradient: {
    borderRadius: 12,
    padding: 1,
  },
  textAreaGradient: {
    minHeight: 120,
  },
  textInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 11,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666B8A',
    textAlign: 'right',
  },
  deviceInfoContainer: {
    gap: 8,
  },
  deviceInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deviceInfoCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  deviceInfoGradient: {
    padding: 16,
    borderRadius: 12,
  },
  deviceInfoText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deviceInfoSubtext: {
    fontSize: 12,
    color: '#666B8A',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default BugReportScreen;
