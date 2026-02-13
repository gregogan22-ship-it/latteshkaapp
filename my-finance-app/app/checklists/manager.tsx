// app/checklists/manager.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

type ManagerItem = {
  id: string;
  title: string;
  tasks: Task[];
  icon: string;
};

export default function ManagerChecklists() {
  const router = useRouter();

  const [managerItems, setManagerItems] = useState<ManagerItem[]>([
    {
      id: '1',
      title: 'Ежедневный чек-лист менеджера',
      icon: 'calendar-number-outline',
      tasks: [
        { id: '1', title: 'Проверить план дня', completed: false },
        { id: '2', title: 'Обойти объект', completed: false },
        { id: '3', title: 'Сдать отчёт', completed: false },
      ],
    },
    {
      id: '2',
      title: 'Контроль Ген уборки',
      icon: 'sparkles-outline',
      tasks: [
        { id: '1', title: 'Проверить чистоту кухни', completed: false },
        { id: '2', title: 'Проверить санузлы', completed: false },
        { id: '3', title: 'Проверить общий зал', completed: false },
      ],
    },
    {
      id: '3',
      title: 'Контроль составления отчётов',
      icon: 'document-text-outline',
      tasks: [
        { id: '1', title: 'Проверить отчёт по продажам', completed: false },
        { id: '2', title: 'Проверить отчёт по расходам', completed: false },
        { id: '3', title: 'Подписать отчёт', completed: false },
      ],
    },
  ]);

  const getProgress = (tasks: Task[]) => {
    const completed = tasks.filter(t => t.completed).length;
    return { completed, total: tasks.length };
  };

  const renderItem = ({ item }: { item: ManagerItem }) => {
    const progress = getProgress(item.tasks);
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push({
          pathname: '/checklist-detail',
          params: { id: item.id, type: 'manager' },
        })}
      >
        <View style={styles.itemContent}>
          <Ionicons name={item.icon} size={48} color="#f4511e" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.progressText}>
              {progress.completed}/{progress.total}
            </Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={{
              width: `${(progress.completed / progress.total) * 100}%`,
              backgroundColor: '#f4511e',
              height: 8,
              borderRadius: 4,
            }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={managerItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Пунктов пока нет</Text>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  list: { padding: 16 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});