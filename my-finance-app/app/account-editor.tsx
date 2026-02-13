// app/account-editor.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AccountEditor() {
  return (
    <ScrollView style={styles.container}>
      {/* Аватарка + имя + статус (как в Telegram) */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: 'https://via.placeholder.com/150' }} // ← заглушка, потом можно загрузка реального фото
            style={styles.avatar}
          />
          <Pressable style={styles.editAvatarButton}>
            <Ionicons name="camera-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.username}>Григорий</Text>
        <Text style={styles.status}>Онлайн</Text>
      </View>

      {/* Список пунктов аккаунта */}
      <View style={styles.menuList}>
        <Pressable style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#555" style={styles.menuIcon} />
          <Text style={styles.menuText}>Редактировать профиль</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#555" style={styles.menuIcon} />
          <Text style={styles.menuText}>Уведомления</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#555" style={styles.menuIcon} />
          <Text style={styles.menuText}>Приватность и безопасность</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Ionicons name="moon-outline" size={24} color="#555" style={styles.menuIcon} />
          <Text style={styles.menuText}>Тёмная тема</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
        </Pressable>

        {/* Выход — красный */}
        <Pressable style={[styles.menuItem, styles.logoutItem]}>
          <Ionicons name="log-out-outline" size={24} color="#ff4444" style={styles.menuIcon} />
          <Text style={[styles.menuText, { color: '#ff4444' }]}>Выйти из аккаунта</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f4511e',
    borderRadius: 20,
    padding: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  menuList: {
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    marginRight: 16,
    width: 30,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});