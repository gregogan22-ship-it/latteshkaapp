// app/(tabs)/settings.tsx — настройки и пользователи/права
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

export default function Settings() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('user');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const loadUserAndUsers = async () => {
      try {
        // Получаем текущего пользователя из AsyncStorage
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          setCurrentUserRole(user.user_metadata?.role || 'user');
          setCurrentUserId(user.id);
        }

        // Загружаем список пользователей из Supabase
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .order('created_at', { ascending: false });

        console.log('Supabase ответ:', { data, error });

        if (error) {
          Alert.alert('Ошибка Supabase', error.message);
          return;
        }

        setUsers(data || []);
      } catch (err) {
        Alert.alert('Ошибка', 'Не удалось загрузить пользователей');
      } finally {
        setLoading(false);
      }
    };

    loadUserAndUsers();
  }, []);

  const changeRole = async (userId, newRole) => {
    if (currentUserRole !== 'owner') {
      Alert.alert('Нет прав', 'Только владелец может менять роли');
      return;
    }

    if (userId === currentUserId && newRole !== 'owner') {
      Alert.alert('Ошибка', 'Вы не можете понизить свою роль');
      return;
    }

    Alert.alert(
      'Изменить роль',
      `Сделать пользователя ${newRole === 'owner' ? 'владельцем' : newRole === 'manager' ? 'менеджером' : 'сотрудником кофейни'}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Изменить',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

              if (error) throw error;

              // Обновляем список в приложении
              setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
              Alert.alert('Успех', 'Роль изменена');
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось изменить роль');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.multiRemove(['token', 'refresh_token', 'user']);
      Alert.alert('Выход', 'Вы вышли из аккаунта');
      router.replace('/login');
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось выйти');
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userItem}>
      <Text style={styles.userName}>{item.full_name || item.email}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
      <Text style={styles.userRole}>Роль: {item.role || 'user'}</Text>

      {/* Кнопки смены роли — видны только для owner */}
      {currentUserRole === 'owner' && (
        <View style={styles.roleButtons}>
          <Pressable style={[styles.roleBtn, styles.ownerBtn]} onPress={() => changeRole(item.id, 'owner')}>
            <Text style={styles.roleBtnText}>Owner</Text>
          </Pressable>
          <Pressable style={[styles.roleBtn, styles.managerBtn]} onPress={() => changeRole(item.id, 'manager')}>
            <Text style={styles.roleBtnText}>Manager</Text>
          </Pressable>
          <Pressable style={[styles.roleBtn, styles.coffeeBtn]} onPress={() => changeRole(item.id, 'coffee-shop')}>
            <Text style={styles.roleBtnText}>Coffee Shop</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#f4511e" style={{ flex: 1, justifyContent: 'center' }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Пользователи и права</Text>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        ListEmptyComponent={<Text style={styles.emptyText}>Пользователей пока нет</Text>}
      />

      {/* Кнопка выхода */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выход</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 4 },
  userRole: { fontSize: 14, color: '#f4511e', marginTop: 4 },
  roleButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  roleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  ownerBtn: { backgroundColor: '#ff4444' },
  managerBtn: { backgroundColor: '#2196f3' },
  coffeeBtn: { backgroundColor: '#4caf50' },
  roleBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptyText: { fontSize: 18, color: '#888', textAlign: 'center', marginTop: 40 },
});