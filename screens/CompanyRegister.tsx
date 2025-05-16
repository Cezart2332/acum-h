import React from 'react';
import { Image } from 'react-native';
import { StyleSheet, Text, View, SafeAreaView,TouchableWithoutFeedback,Keyboard, TextInput, Platform, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from './RootStackParamList';

type CompanyReg = NativeStackNavigationProp<RootStackParamList, 'CompanyReg'>;

export default function CompanyRegister({ navigation }: { navigation: CompanyReg }) {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [cui, setCui] = React.useState('');
    const [category, setCategory] = React.useState('party events');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState(false);

    const validateCui = (cui: string) => {
        const cuiNumber = parseInt(cui, 10);
        return !isNaN(cuiNumber) && cuiNumber > 0;
    };

   const defaultImage = require('../assets/default.jpg');

 

    const onRegister = async () => {
        const { uri: defaultUri } = Image.resolveAssetSource(defaultImage);

        if (
            name.trim() === "" ||
            email.trim() === "" ||
            address.trim() === "" ||
            cui.trim() === "" ||
            category.trim() === "" ||
            password.trim() === ""
        ) {
            setError(true);
            return;
        }

        if (!validateCui(cui)) {
            Alert.alert("Error", "Invalid CUI. Please enter a valid number.");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("email", email);
        formData.append("address", address);
        formData.append("cui", cui);
        formData.append("category", category);
        formData.append("password", password);
        formData.append("default", {
            uri: defaultUri,
            name: "default.jpg",
            type: "image/jpg",
        } as any);

        try {
            const response = await fetch("http://192.168.70.167:5298/companies", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to register company.");
            }

            const data = await response.json();
            await AsyncStorage.setItem("company", JSON.stringify(data));
            await AsyncStorage.setItem("loggedIn",JSON.stringify(true))
            await AsyncStorage.setItem("isCompany",JSON.stringify(true))
            navigation.replace("Home");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong.");
        }
    };
    return (
     <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>AcoomH</Text>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Ionicons name="briefcase-outline" size={20} style={styles.icon} />
                        <TextInput
                            placeholder="Company Name"
                            placeholderTextColor="#888"
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={20} style={styles.icon} />
                        <TextInput
                            placeholder="Email"
                            placeholderTextColor="#888"
                            style={styles.input}
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Ionicons name="location-outline" size={20} style={styles.icon} />
                        <TextInput
                            placeholder="Address"
                            placeholderTextColor="#888"
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Ionicons name="keypad-outline" size={20} style={styles.icon} />
                        <TextInput
                            placeholder="CUI"
                            placeholderTextColor="#888"
                            style={styles.input}
                            keyboardType="numeric"
                            value={cui}
                            onChangeText={setCui}
                        />
                    </View>
                    <View style={[styles.inputGroup, styles.pickerGroup]}>
                        <Ionicons name="list-outline" size={20} style={[styles.icon, { marginLeft: 10 }]} />
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={category}
                                onValueChange={(itemValue) => setCategory(itemValue)}
                                dropdownIconColor="#333"
                                style={styles.picker}
                            >
                                <Picker.Item label="Party Events" value="partyevents" />
                                <Picker.Item label="Restaurants" value="restaurants" />
                                <Picker.Item label="Fast Food" value="fastfood" />
                            </Picker>
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} style={styles.icon} />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#888"
                            style={styles.input}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>
                    <TouchableOpacity style={styles.button} onPress={onRegister}>
                        <Text style={styles.buttonText}>Submit</Text>
                    </TouchableOpacity>
                    <View style={styles.footer}>
                        <Text style={styles.footerInfo}>Ai deja cont?</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.footerLink}> Autentifică-te</Text>
                            </TouchableOpacity>
                    </View>
                    {error ? (
                        <Text style={styles.errorText}>Trebuie sa completezi toate campurile</Text>
                    ) : null}
                </View>

            </View>
        </SafeAreaView>
    </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'blue',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    card: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    pickerGroup: {
        paddingHorizontal: 0,
        minHeight: 50,
    },
    pickerContainer: {
        flex: 1,
        backgroundColor: '#f2f2f2',
        borderRadius: 10,
        justifyContent: 'center',
        height: Platform.OS === 'ios' ? 40 : 50,
    },
    picker: {
        width: '100%',
        color: '#333',
    },
    icon: {
        marginRight: 5,
    },
    input: {
        flex: 1,
        height: Platform.OS === 'ios' ? 40 : 45,
        color: '#333',
        paddingVertical: 5,
    },
    button: {
        backgroundColor: 'blue',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
      footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  footerInfo: { color: '#555' },
  footerLink: { color: '#4900ff', fontWeight: 'bold', marginLeft: 5 },
  errorText:{color:'red',fontSize:20,marginTop:5, textAlign:'center',fontWeight:"bold"  }
});