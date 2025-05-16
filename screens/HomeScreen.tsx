import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootStackParamList';
type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface UserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
}
interface CompanyData {
  id?: number;
  name?: string;
  email?: string;
  address?: string;
  cui?: number;
  category?: string;
  profileImage?: string;
}
interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: any; 
}

type ProfileData = UserData | CompanyData;


export default function HomeScreen({ navigation }: { navigation: HomeNav }) {
  const [userData, setUserData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[] | null>(null);
  const [isC, setIsC] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const isCompanyStr = await AsyncStorage.getItem('isCompany');
      const isCompany = isCompanyStr === 'true';
      setIsC(isCompany);

      try {
        if (isCompany) {
          const jsonValue = await AsyncStorage.getItem('company');
          const parsed = jsonValue ? JSON.parse(jsonValue) as CompanyData : null;
          setUserData(parsed);
        } else {
          const jsonValue = await AsyncStorage.getItem('user');
          const parsed = jsonValue ? JSON.parse(jsonValue) as UserData : null;
          setUserData(parsed);
        }
      } catch (err) {
        console.warn('Loading data failed', err);
      }
      try {
        const response = await fetch('http://192.168.70.167:5298/events');
        const data = await response.json();
        setEvents(data);
      }catch (err) {
        console.warn('Fetching events failed', err);
      }
      setLoading(false);
    })();
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Evenimente</Text>
      {loading ? (
        <View style={styles.profilePlaceholder} />
      ) : userData?.profileImage ? (
        <TouchableOpacity
        onPress={() => navigation.navigate("Profile")}
        >
                  <Image
          style={styles.profilePic}
          source={{ uri: `data:image/jpg;base64,${userData.profileImage}` }}
        />
        </TouchableOpacity>
      ) : (
        <View style={styles.profilePlaceholder} />
      )}
    </View>
  );

  const renderItem = ({ item }: { item: EventData }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("EventScreen", { event: item,isCompany: isC })}>
      <ImageBackground
        source={{ uri: `data:image/jpg;base64,${item.photo}` }}
        style={styles.cardImage}
        imageStyle={styles.cardImageStyle}
      >
        <View style={styles.cardOverlay} />
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDate}>{item.description}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {renderHeader()}

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#cccccc',
  },
  loader: {
    marginTop: 50,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fdfdfd',
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
    objectFit: 'fill',
  },
  cardImageStyle: {
    borderRadius: 16,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  cardTextContainer: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardDate: {
    fontSize: 14,
    color: '#eeeeee',
    marginTop: 4,
  },
});