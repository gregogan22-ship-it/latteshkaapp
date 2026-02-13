// app/(tabs)/dashboard.tsx — главная страница
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Dashboard() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('Григорий'); // по умолчанию, если не загрузилось

  useEffect(() => {
    // Загрузка имени пользователя из AsyncStorage
    const loadUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          setUserName(user.user_metadata?.full_name || user.full_name || 'Григорий');
        }
      } catch (err) {
        console.error('Ошибка загрузки пользователя:', err);
      }
    };
    loadUser();

    // Заглушка погоды
    setTimeout(() => {
      setWeather({ temp: 7, condition: 'Облачно', icon: 'cloudy-outline' });
      setLoading(false);
    }, 1500);

    // Обновление времени каждые 30 секунд
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const dayOfWeek = currentTime.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dateStr = currentTime.toLocaleDateString('ru-RU');
  const timeStr = currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      {/* Хедер — персонализированное приветствие */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Привет, {userName}!</Text>
      </View>

      {/* Время и дата */}
      <View style={styles.timeBlock}>
        <Text style={styles.time}>{timeStr}</Text>
        <Text style={styles.date}>
          {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, {dateStr}
        </Text>
      </View>

      {/* Погода */}
      <View style={styles.weatherCard}>
        {loading ? (
          <ActivityIndicator size="large" color="#f4511e" />
        ) : (
          <>
            <Ionicons name={weather?.icon} size={80} color="#f4511e" />
            <Text style={styles.temp}>{weather?.temp}°C</Text>
            <Text style={styles.condition}>{weather?.condition}</Text>
          </>
        )}
      </View>

      <Text style={styles.placeholder}>Здесь будут виджеты и быстрый доступ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  timeBlock: { alignItems: 'center', marginBottom: 40 },
  time: { fontSize: 64, fontWeight: '200', color: '#222' },
  date: { fontSize: 18, color: '#666', marginTop: 8 },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  temp: { fontSize: 52, fontWeight: 'bold', color: '#f4511e', marginVertical: 8 },
  condition: { fontSize: 20, color: '#555' },
  placeholder: { fontSize: 16, color: '#888', textAlign: 'center' },
});