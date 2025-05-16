import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from './RootStackParamList';

// Params: an event object with minimal fields
type EventNav = NativeStackNavigationProp<RootStackParamList, 'EventScreen'>;
type EventRoute = RouteProp<RootStackParamList, 'EventScreen'>;

interface Props {
  navigation: EventNav;
  route: EventRoute;
}

const { width } = Dimensions.get('window');

const EventScreen: React.FC<Props> = ({ route }) => {
  // Placeholder data from params
  const { event, isCompany } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Image Section */}
      <View style={styles.imageContainer}>
        <ImageBackground
           source={{ uri: `data:image/jpg;base64,${event.photo}` }}
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.overlay} />
          <Text style={styles.title}>Event Title</Text>
        </ImageBackground>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{event.title}</Text>
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.text}>{event.description}</Text>
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.text}>123 Main Street, Bucharest</Text>
      </View>

      {/* Additional Placeholder Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <Text style={styles.text}>Starts: 10:00 AM</Text>
        <Text style={styles.text}>Ends: 4:00 PM</Text>
      </View>

      {/* Action Button */}
      {!isCompany && (
        <TouchableOpacity style={styles.button} onPress={() => {/* logic */}}>
          <Text style={styles.buttonText}>I Attend</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 24 },
  imageContainer: { width, height: width * 0.6 },
  imageBackground: { flex: 1, justifyContent: 'flex-end' },
  imageStyle: { resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', padding: 16 },
  section: { marginVertical: 12, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  text: { fontSize: 14, color: '#555', lineHeight: 20 },
  button: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#0066cc',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default EventScreen;
