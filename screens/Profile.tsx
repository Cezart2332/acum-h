import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  FlatList,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

// Define data interfaces
interface UserData {
  id: number;
  username?: string;
  name?: string;
  profileImage?: string;
}
interface CompanyData {
  id: number;
  name?: string;
  profileImage?: string;
}
interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
}

type ProfileData = UserData | CompanyData;

const Profile: React.FC = () => {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [isCompany, setIsCompany] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<EventData[]>([]);

  // Load user data once
  useEffect(() => {
    (async () => {
      const isC = (await AsyncStorage.getItem('isCompany')) === 'true';
      setIsCompany(isC);
      try {
        const key = isC ? 'company' : 'user';
        const stored = await AsyncStorage.getItem(key);
        if (stored) setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch events if company
  useEffect(() => {
    if (isCompany && user && 'id' in user) {
      (async () => {
        const form = new FormData();
        form.append('id', user.id.toString());
        try {
          const res = await fetch('http://192.168.70.167:5298/companyevents', {
            method: 'POST',
            body: form,
          });
          const data: EventData[] = await res.json();
          setEvents(data);
        } catch (e) {
          console.error(e);
        }
      })();
    }
  }, [isCompany, user]);

  // Pick and upload image
  const handlePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Access denied', 'Need permission to access photos');
      return;
    }
    if (!user || !('id' in user)) {
      Alert.alert('Error', 'No authenticated company');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = uri.split('/').pop() ?? 'photo.jpg';
    const match = filename.match(/\.(\w+)$/);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const form = new FormData();
    form.append('companyId', user.id.toString());
    // Cast to any to satisfy TS
    form.append('file', { uri, name: filename, type } as any);

    try {
      const res = await fetch('http://192.168.70.167:5298/changepfpcompany', {
        method: 'PUT',
        body: form,
      });
      if (res.ok) Alert.alert('Success', 'Profile image updated');
      else Alert.alert('Error', 'Upload failed');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Network error');
    }
  };

  // Render one event
  const renderEvent = ({ item }: { item: EventData }) => (
    <Pressable style={styles.card}>
      <ImageBackground
        source={{ uri: `data:image/jpg;base64,${item.photo}` }}
        style={styles.cardImage}
        imageStyle={styles.cardImageStyle}
      >
        <View style={styles.overlay} />
        <View style={styles.textOverlay}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDesc}>{item.description}</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );

  if (loading) return <ActivityIndicator style={styles.loader} size="large" />;

  return (
    <SafeAreaView style={styles.container}>
      {user && 'profileImage' in user && user.profileImage ? (
        <TouchableOpacity onPress={handlePick} style={styles.avatarContainer}>
          <Image
            source={{ uri: `data:image/jpg;base64,${user.profileImage}` }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}

      <Text style={styles.username}>
        {user ? (('username' in user && user.username) || ('name' in user && user.name) || 'No Name') : 'No Name'}
      </Text>

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{isCompany ? events.length : 10}</Text>
          <Text style={styles.statLabel}>{isCompany ? 'Published' : 'Attended'}</Text>
        </View>
        {isCompany && (
          <View style={styles.statBox}>
            <Text style={styles.statNum}>20</Text>
            <Text style={styles.statLabel}>Reach</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Your Events</Text>
      {isCompany && events.length === 0 ? (
        <Text style={styles.emptyText}>No events yet.</Text>
      ) : (
        <FlatList<EventData>
          data={events}
          keyExtractor={(i) => i.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', alignItems: 'center', padding: 16 },
  loader: { flex: 1, justifyContent: 'center' },
  avatarContainer: { elevation: 4, borderRadius: 75, overflow: 'hidden' },
  avatar: { width: 150, height: 150, borderRadius: 75 },
  avatarPlaceholder: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#ddd', marginVertical: 24 },
  username: { fontSize: 22, fontWeight: '600', marginTop: 12, color: '#333' },
  stats: { flexDirection: 'row', marginVertical: 16 },
  statBox: { alignItems: 'center', marginHorizontal: 16 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#444' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  sectionTitle: { alignSelf: 'flex-start', fontSize: 18, fontWeight: '600', marginVertical: 8, color: '#222' },
  emptyText: { color: '#888', marginTop: 16 },
  list: { paddingBottom: 16 },
  card: { width: 300, height: 180, borderRadius: 12, overflow: 'hidden', marginVertical: 8, elevation: 3, backgroundColor: '#fff' },
  cardImage: { flex: 1, justifyContent: 'flex-end' },
  cardImageStyle: { borderRadius: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  textOverlay: { padding: 12 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  eventDesc: { fontSize: 12, color: '#eee', marginTop: 4 },
});

export default Profile;