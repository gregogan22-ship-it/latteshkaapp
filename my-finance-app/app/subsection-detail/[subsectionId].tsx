// app/subsection-detail/[subsectionId].tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Pressable, Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';

const API_URL = 'http://192.168.31.184:3001/api';

export default function SubsectionDetail() {
  const { id, subsectionId } = useLocalSearchParams(); // id чек-листа и subsectionId
  const router = useRouter();

  const [checklist, setChecklist] = useState(null);
  const [subsection, setSubsection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [photoRequired, setPhotoRequired] = useState(false);

  useEffect(() => {
    if (id && subsectionId) fetchChecklist();
  }, [id, subsectionId]);

  const fetchChecklist = async () => {
    try {
      const res = await axios.get(`${API_URL}/checklists/${id}`);
      setChecklist(res.data);
      const foundSub = res.data.subsections.find(sub => sub._id === subsectionId);
      setSubsection(foundSub);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось загрузить подраздел');
    } finally {
      setLoading(false);
    }
  };

  const saveSubsection = async (updatedSubsection) => {
    try {
      const updatedSubsections = checklist.subsections.map(sub => 
        sub._id === subsectionId ? updatedSubsection : sub
      );
      const res = await axios.put(`${API_URL}/checklists/${id}`, {
        subsections: updatedSubsections,
      });
      setChecklist(res.data);
      setSubsection(updatedSubsection);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
    }
  };

  const toggleTask = (taskId) => {
    const updatedTasks = subsection.tasks.map(task =>
      task._id === taskId ? { ...task, completed: !task.completed } : task
    );
    saveSubsection({ ...subsection, tasks: updatedTasks });
  };

  const deleteTask = (taskId) => {
    Alert.alert(
      'Удалить задачу?',
      'Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const updatedTasks = subsection.tasks.filter(task => task._id !== taskId);
            saveSubsection({ ...subsection, tasks: updatedTasks });
          },
        },
      ]
    );
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Ошибка', 'Название задачи обязательно');
      return;
    }

    const updatedTasks = [
      ...(subsection.tasks || []),
      {
        title: newTaskTitle.trim(),
        completed: false,
        photoRequired,
      },
    ];

    saveSubsection({ ...subsection, tasks: updatedTasks });
    setNewTaskTitle('');
    setPhotoRequired(false);
    Alert.alert('Успех', 'Задача добавлена!');
  };

  const updateTaskComment = (taskId, comment) => {
    const updatedTasks = subsection.tasks.map(task =>
      task._id === taskId ? { ...task, comment } : task
    );
    saveSubsection({ ...subsection, tasks: updatedTasks });
  };

  if (loading) return <ActivityIndicator size="large" color="#f4511e" style={{ flex: 1, justifyContent: 'center' }} />;

  if (!subsection) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Подраздел не найден</Text>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Text style={styles.title}>{subsection.title}</Text>

      <FlatList
        data={subsection.tasks || []}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <TouchableOpacity onPress={() => toggleTask(item._id)}>
              <Ionicons
                name={item.completed ? 'checkbox' : 'square-outline'}
                size={28}
                color={item.completed ? '#4caf50' : '#757575'}
              />
            </TouchableOpacity>

            <View style={styles.taskContent}>
              <Text style={[styles.taskTitle, item.completed && styles.completed]}>
                {item.title}
              </Text>

              <TextInput
                style={styles.commentInput}
                placeholder="Комментарий (необязательно)"
                value={item.comment || ''}
                onChangeText={(text) => updateTaskComment(item._id, text)}
                multiline
              />

              <View style={styles.photoSwitch}>
                <Text style={styles.switchLabel}>Обязательно фото</Text>
                <Switch
                  value={item.photoRequired || false}
                  onValueChange={(value) => {
                    const updatedTasks = subsection.tasks.map(t =>
                      t._id === item._id ? { ...t, photoRequired: value } : t
                    );
                    saveSubsection({ ...subsection, tasks: updatedTasks });
                  }}
                  trackColor={{ false: '#767577', true: '#f4511e' }}
                  thumbColor={item.photoRequired ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>

            <Pressable onPress={() => deleteTask(item._id)}>
              <Ionicons name="trash-outline" size={24} color="#ff4444" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Задач пока нет</Text>}
        contentContainerStyle={styles.list}
      />

      {/* Добавление новой задачи */}
      <View style={styles.addTaskContainer}>
        <TextInput
          style={styles.addTaskInput}
          placeholder="Новая задача..."
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          multiline
        />
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Обязательно фото</Text>
          <Switch
            value={photoRequired}
            onValueChange={setPhotoRequired}
            trackColor={{ false: '#767577', true: '#f4511e' }}
            thumbColor={photoRequired ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Pressable style={styles.addTaskButton} onPress={addTask}>
          <Ionicons name="add-circle" size={32} color="#f4511e" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', padding: 16, textAlign: 'center' },
  list: { padding: 16 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskContent: { flex: 1, marginLeft: 12 },
  taskTitle: { fontSize: 16, color: '#333' },
  completed: { textDecorationLine: 'line-through', color: '#888' },
  commentInput: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    fontSize: 14,
  },
  photoSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  switchLabel: { fontSize: 14, marginRight: 8 },
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addTaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  addTaskButton: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#888', textAlign: 'center', marginTop: 40 },
});