// app/(tabs)/retail.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function RetailScreen() {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Чек-листы',
      icon: 'checkbox-outline',
      onPress: () => router.push('/checklists'),
    },
    {
      title: 'График работы',
      icon: 'calendar-outline',
      onPress: () => alert('График работы — скоро реализуем'),
    },
    {
      title: 'Кассы',
      icon: 'cash-outline',
      onPress: () => alert('Кассы — скоро реализуем'),
    },
    {
      title: 'Смены',
      icon: 'time-outline',
      onPress: () => alert('Смены — скоро реализуем'),
    },
    {
      title: 'Инвентаризация',
      icon: 'barcode-outline',
      onPress: () => alert('Инвентаризация — скоро реализуем'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Розница</Text>
      <Text style={styles.subtitle}>Выберите раздел</Text>

      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.card} onPress={item.onPress}>
            <Ionicons name={item.icon} size={40} color="#f4511e" />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginTop: 20, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    width: '45%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 16, textAlign: 'center' },
});