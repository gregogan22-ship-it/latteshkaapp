// app/(drawer)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DrawerLayout() {
  const [role, setRole] = useState('user');

  useEffect(() => {
    const loadRole = async () => {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setRole(user.user_metadata?.role || user.role || 'user');
      }
    };
    loadRole();
  }, []);

  return (
    <Drawer
      screenOptions={{
        drawerStyle: { width: 300, backgroundColor: '#fff' },
        drawerActiveTintColor: '#f4511e',
        drawerInactiveTintColor: '#555',
        drawerLabelStyle: { fontSize: 16 },
        headerShown: false,
      }}
    >
      {/* Всегда показываем быстрый доступ к чек-листам */}
      <Drawer.Screen
        name="checklists"
        options={{
          drawerLabel: 'Чек-листы',
          drawerIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />

      {/* Только для manager и owner */}
      {role !== 'coffee-shop' && (
        <>
          <Drawer.Screen
            name="account-editor"
            options={{
              drawerLabel: 'Редактор аккаунта',
              drawerIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="payroll-balance"
            options={{
              drawerLabel: 'Баланс заработной платы',
              drawerIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="bonus-balance"
            options={{
              drawerLabel: 'Остаток бонусов',
              drawerIcon: ({ color, size }) => <Ionicons name="gift-outline" size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="tasks"
            options={{
              drawerLabel: 'Задачи',
              drawerIcon: ({ color, size }) => <Ionicons name="checkmark-circle-outline" size={size} color={color} />,
            }}
          />
        </>
      )}

      {/* Выход для всех */}
      <Drawer.Screen
        name="logout"
        options={{
          drawerLabel: 'Выход',
          drawerIcon: ({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />,
        }}
      />
    </Drawer>
  );
}