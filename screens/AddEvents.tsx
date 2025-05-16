import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput, TouchableOpacity,TouchableWithoutFeedback,Keyboard, StyleSheet, Alert, SafeAreaView } from 'react-native';

interface CompanyData {
  id?: number;
  name?: string;
  email?: string;
  address?: string;
  cui?: number;
  category?: string;
  profileImage?: string;
}

const AddEvents: React.FC = () => {
    const [companyData, setCompanyData] = useState<CompanyData | null>(null);
    const [eventName, setEventName] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
    


    const pickImage = async () => {
        const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if(status !== "granted"){  
            Alert.alert("Permission to access camera roll is required!");
            return;
        }  
        else{
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                aspect: [16, 9],
                quality: 1,
            });

            if (!result.canceled) {
                setFile(result.assets[0]);
            } else {
                Alert.alert("You did not select any image");
            }
        }
    }

    const handleAddEvent = async () => {
        if (!eventName || !eventDescription) {
            Alert.alert('Please fill in all fields');
            return;
        }
        else{
            console.log(companyData?.id)
            const formData = new FormData();
            formData.append("title", eventName);
            formData.append("description", eventDescription);
            if (file) {
                formData.append("file", {
                    uri: file.uri,
                    name: file.fileName || 'event.jpg',
                    type: file.type || 'image/jpeg',
                } as any);
            }
            formData.append("companyId", companyData?.id?.toString() || '0');
            const response = await fetch("http://192.168.0.150:5298/events", {
                method: "POST",
                body: formData,
            });
            console.log(response.status);
        }
    };
    useEffect(() => {
        const getCompany = async () => {
            const jsonValue = await AsyncStorage.getItem('company');
            const parsed = jsonValue ? JSON.parse(jsonValue) as CompanyData : null;
            setCompanyData(parsed);
        }
        getCompany()
    }, []);


    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <SafeAreaView style={styles.container}>
                <Text style={styles.title}>Add New Event</Text>
                {file && <Image source={{ uri: file.uri }} style={styles.image} />}
                    <TouchableOpacity style={styles.button}
                    onPress={pickImage}>
                    <Text >
                        Choose Image
                    </Text>
                </TouchableOpacity>
                <View style={styles.inputGroup}>
                    <Ionicons name="reader-outline" size={20} color="#555" style={{ marginRight: 10 }} />
                    <TextInput
                    placeholder="Event Name"
                    value={eventName}
                    onChangeText={setEventName}
                    />
                </View>

                <View style={styles.inputGroup}>

                    <TextInput
                    multiline
                    style={{ height: 100, textAlignVertical: 'top', alignItems: 'flex-start' }}
                    placeholder="Event Description"
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    />
                </View>
                <TouchableOpacity style={styles.button} onPress={handleAddEvent}>
                    <Text style={{ color: '#fff', fontSize: 20,fontWeight:600 }}>Add Event</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 50,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        gap: 16,
    },
    title: {
        fontSize: 24,
        marginBottom: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        padding:12,
        paddingHorizontal: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    button:{
        backgroundColor: 'purple',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    image: {
    width: 200,
    height: 200,
  },
});

export default AddEvents;