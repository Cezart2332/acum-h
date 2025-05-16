import React, { useState } from 'react';
import { View, StyleSheet, TextInput, FlatList, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const sample = [
  'Concert', 'Expoziție', 'Maraton', 'Teatru'
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const filtered = sample.filter(item => item.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#888" />
        <TextInput
          style={styles.input}
          placeholder="Caută evenimente..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>{item}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  searchBox: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 3 },
  input: { flex: 1, height: 48, marginLeft: 8, fontSize: 16 },
  item: { padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, elevation: 1 },
  itemText: { fontSize: 16, color: '#333' }
});
