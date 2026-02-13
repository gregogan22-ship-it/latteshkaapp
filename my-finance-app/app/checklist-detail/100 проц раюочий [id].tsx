// app/checklist-detail.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Pressable, Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://192.168.31.183:3001/api';

export default function ChecklistDetail() {
  const { id } = useLocalSearchParams();
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubsectionId, setSelectedSubsectionId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [photoRequired, setPhotoRequired] = useState(false);

  useEffect(() => {
    if (id) fetchChecklist();
  }, [id]);

  const fetchChecklist = async () => {
    try {
      const res = await axios.get(`${API_URL}/checklists/${id}`);
      setChecklist(res.data);
      // Автоматически выбираем первый подраздел, если есть
      if (res.data.subsections?.length > 0) {
        setSelectedSubsectionId(res.data.subsections[0]._id);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось загрузить чек-лист');
    } finally {
      setLoading(false);
    }
  };

  const saveChecklist = async (updatedData) => {
    try {
      const res = await axios.put(`${API_URL}/checklists/${id}`, updatedData);
      setChecklist(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
    }
  };

  const toggleTask = (subsectionId, taskId) => {
    const updatedSubsections = checklist.subsections.map(sub => {
      if (sub._id === subsectionId) {
        const updatedTasks = sub.tasks.map(task =>
          task._id === taskId ? { ...task, completed: !task.completed } : task
        );
        return { ...sub, tasks: updatedTasks };
      }
      return sub;
    });
    saveChecklist({ subsections: updatedSubsections });
  };

  const deleteTask = (subsectionId, taskId) => {
    Alert.alert(
      'Удалить задачу?',
      'Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            const updatedSubsections = checklist.subsections.map(sub => {
              if (sub._id === subsectionId) {
                const updatedTasks = sub.tasks.filter(task => task._id !== taskId);
                return { ...sub, tasks: updatedTasks };
              }
              return sub;
            });
            saveChecklist({ subsections: updatedSubsections });
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

    if (!selectedSubsectionId) {
      Alert.alert('Ошибка', 'Выберите подраздел');
      return;
    }

    const updatedSubsections = checklist.subsections.map(sub => {
      if (sub._id === selectedSubsectionId) {
        const updatedTasks = [
          ...sub.tasks,
          {
            title: newTaskTitle.trim(),
            completed: false,
            photoRequired,
          },
        ];
        return { ...sub, tasks: updatedTasks };
      }
      return sub;
    });

    saveChecklist({ subsections: updatedSubsections });
    setNewTaskTitle('');
    setPhotoRequired(false);
    Alert.alert('Успех', 'Задача добавлена!');
  };

  const updateTaskComment = (subsectionId, taskId, comment) => {
    const updatedSubsections = checklist.subsections.map(sub => {
      if (sub._id === subsectionId) {
        const updatedTasks = sub.tasks.map(task =>
          task._id === taskId ? { ...task, comment } : task
        );
        return { ...sub, tasks: updatedTasks };
      }
      return sub;
    });
    saveChecklist({ subsections: updatedSubsections });
  };

  const takePhoto = async (subsectionId, taskId) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нет доступа к камере');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const updatedSubsections = checklist.subsections.map(sub => {
        if (sub._id === subsectionId) {
          const updatedTasks = sub.tasks.map(task =>
            task._id === taskId ? { ...task, photoUrl: `data:image/jpeg;base64,${result.assets[0].base64}` } : task
          );
          return { ...sub, tasks: updatedTasks };
        }
        return sub;
      });
      saveChecklist({ subsections: updatedSubsections });
      Alert.alert('Успех', 'Фото добавлено');
    }
  };

  const deleteChecklist = () => {
    Alert.alert(
      'Удалить чек-лист?',
      'Все подразделы и задачи будут удалены. Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/checklists/${id}`);
              Alert.alert('Успех', 'Чек-лист удалён');
              router.back();
            } catch (err) {
              console.error(err);
              Alert.alert('Ошибка', 'Не удалось удалить чек-лист');
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator size="large" color="#f4511e" style={{ flex: 1, justifyContent: 'center' }} />;

  if (!checklist) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Чек-лист не найден</Text>;

  const selectedSub = checklist.subsections?.find(sub => sub._id === selectedSubsectionId) || null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <FlatList
        data={checklist.subsections || []}
        keyExtractor={item => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.subsectionButton,
              selectedSubsectionId === item._id && styles.selectedSubsection
            ]}
            onPress={() => setSelectedSubsectionId(item._id)}
          >
            <Text style={styles.subsectionButtonText}>{item.title}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Подразделов пока нет</Text>
        }
        style={styles.subsectionsList}
      />

      {selectedSub ? (
        <FlatList
          data={selectedSub.tasks || []}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <View style={styles.taskItem}>
              <TouchableOpacity onPress={() => toggleTask(selectedSub._id, item._id)}>
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
                  onChangeText={(text) => updateTaskComment(selectedSub._id, item._id, text)}
                  multiline
                />

                <View style={styles.photoSwitch}>
                  <Text style={styles.switchLabel}>Обязательно фото</Text>
                  <Switch
                    value={item.photoRequired || false}
                    onValueChange={(value) => {
                      const updatedSubsections = checklist.subsections.map(sub => {
                        if (sub._id === selectedSub._id) {
                          const updatedTasks = sub.tasks.map(t =>
                            t._id === item._id ? { ...t, photoRequired: value } : t
                          );
                          return { ...sub, tasks: updatedTasks };
                        }
                        return sub;
                      });
                      saveChecklist({ subsections: updatedSubsections });
                    }}
                    trackColor={{ false: '#767577', true: '#f4511e' }}
                    thumbColor={item.photoRequired ? '#fff' : '#f4f3f4'}
                  />
                </View>

                {item.photoRequired && (
                  <Pressable onPress={() => takePhoto(selectedSub._id, item._id)} style={styles.photoButton}>
                    {item.photoUrl ? (
                      <Image source={{ uri: item.photoUrl }} style={styles.photoPreview} />
                    ) : (
                      <Ionicons name="camera" size={32} color="#f4511e" />
                    )}
                  </Pressable>
                )}
              </View>

              <Pressable onPress={() => deleteTask(selectedSub._id, item._id)}>
                <Ionicons name="trash-outline" size={24} color="#ff4444" />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Задач пока нет</Text>}
          contentContainerStyle={styles.taskList}
        />
      ) : (
        <Text style={styles.emptyText}>Выберите подраздел</Text>
      )}

      {/* Добавление новой задачи */}
      {selectedSub && (
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 18, color: '#f4511e', marginTop: 8 },
  subsectionsList: { height: 80, paddingHorizontal: 16 },
  subsectionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedSubsection: {
    borderWidth: 2,
    borderColor: '#f4511e',
  },
  subsectionButtonText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  taskList: { padding: 16 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
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
  photoButton: { marginLeft: 12, padding: 8 },
  photoPreview: { width: 60, height: 60, borderRadius: 8 },
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