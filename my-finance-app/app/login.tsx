// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase'; // ← убедись, что путь правильный

export default function Login() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!login.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Заполните логин и пароль');
      return;
    }

    if (isRegister && !fullName.trim()) {
      Alert.alert('Ошибка', 'Введите ФИО');
      return;
    }

    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await supabase.auth.signUp({
          email: login,
          password,
          options: {
            data: { full_name: fullName, role: 'owner' },
          },
        });
      } else {
        res = await supabase.auth.signInWithPassword({
          email: login,
          password,
        });
      }

      if (res.error) throw res.error;

      const { session } = res.data;
      if (session) {
        await AsyncStorage.setItem('token', session.access_token);
        await AsyncStorage.setItem('refresh_token', session.refresh_token);
        await AsyncStorage.setItem('user', JSON.stringify(session.user));

        Alert.alert('Успех', isRegister ? 'Аккаунт создан!' : 'Вы вошли');
        router.replace('/dashboard'); // ← явный переход на главную вкладку
      }
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isRegister ? 'Регистрация' : 'Вход'}</Text>

      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="ФИО"
          value={fullName}
          onChangeText={setFullName}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email (логин)"
        value={login}
        onChangeText={setLogin}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleAuth} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isRegister ? 'Зарегистрироваться' : 'Войти'}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.switchText}>
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#f4511e',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    color: '#f4511e',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
});