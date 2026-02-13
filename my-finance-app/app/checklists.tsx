// app/checklists.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, Modal, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'http://192.168.31.184:3001/api'; // твой IP бэкенда

export default function Checklists() {
  const router = useRouter();
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dueDay, setDueDay] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [withSubsections, setWithSubsections] = useState(false);
  const [subsections, setSubsections] = useState([]);
  const [newSubsectionTitle, setNewSubsectionTitle] = useState('');
  const [isCoffeeShopChecklist, setIsCoffeeShopChecklist] = useState(false); // ← новое поле

  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    try {
      const response = await axios.get(`${API_URL}/checklists`);
      setChecklists(response.data);
    } catch (err) {
      console.error('Ошибка загрузки чек-листов:', err);
      Alert.alert('Ошибка', 'Не удалось загрузить чек-листы');
    } finally {
      setLoading(false);
    }
  };

  const addSubsection = () => {
    if (!newSubsectionTitle.trim()) {
      Alert.alert('Ошибка', 'Название подраздела обязательно');
      return;
    }

    setSubsections([...subsections, { title: newSubsectionTitle.trim() }]);
    setNewSubsectionTitle('');
  };

  const addNewChecklist = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Ошибка', 'Название не может быть пустым');
      return;
    }

    try {
      const payload = {
        title: newTitle.trim(),
        type: 'manager',
        tasks: [],
        dueDay,
        dueDate: dueDate ? dueDate.toISOString() : null,
        isCoffeeShopChecklist,
      };

      if (withSubsections) {
        payload.subsections = subsections.map(sub => ({
          title: sub.title,
          tasks: [],
        }));
      }

      const response = await axios.post(`${API_URL}/checklists`, payload);

      setChecklists([response.data, ...checklists]);
      setNewTitle('');
      setDueDay(null);
      setDueDate(null);
      setWithSubsections(false);
      setSubsections([]);
      setModalVisible(false);
      Alert.alert('Успех', `Чек-лист "${newTitle}" создан!`);
    } catch (err) {
      console.error(err);
      Alert.alert('Ошибка', 'Не удалось создать чек-лист. Проверьте сервер.');
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDueDate(selectedDate);
  };

  const getDueLabel = (item) => {
    if (item.dueDay) {
      const days = {
        monday: 'понедельникам',
        tuesday: 'вторникам',
        wednesday: 'средам',
        thursday: 'четвергам',
        friday: 'пятницам',
        saturday: 'субботам',
        sunday: 'воскресеньям',
      };
      return `По ${days[item.dueDay.toLowerCase()] || item.dueDay}`;
    }
    if (item.dueDate) {
      return new Date(item.dueDate).toLocaleDateString('ru-RU');
    }
    return 'Ежедневный';
  };

  const renderItem = ({ item }) => {
    const completed = item.tasks?.filter(t => t.completed).length || 0;
    const total = item.tasks?.length || 0;

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push(`/checklist-detail/${item._id}`)}
      >
        <View style={styles.itemContent}>
          <Ionicons name="list-outline" size={48} color="#f4511e" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.dueLabel}>{getDueLabel(item)}</Text>
            <Text style={styles.progressText}>{completed}/{total}</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={{
              width: `${total ? (completed / total) * 100 : 0}%`,
              backgroundColor: '#f4511e',
              height: 8,
              borderRadius: 4,
            }}
          />
        </View>

        {/* Кнопка удаления чек-листа */}
        <Pressable
          style={styles.deleteButton}
          onPress={() => deleteChecklist(item._id)}
        >
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </Pressable>
      </TouchableOpacity>
    );
  };

  const deleteChecklist = (checklistId) => {
    Alert.alert(
      'Удалить чек-лист?',
      'Все задачи и подразделы будут удалены. Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/checklists/${checklistId}`);
              setChecklists(checklists.filter(item => item._id !== checklistId));
              Alert.alert('Успех', 'Чек-лист удалён');
            } catch (err) {
              console.error(err);
              Alert.alert('Ошибка', 'Не удалось удалить чек-лист');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
        <Text style={styles.loadingText}>Загрузка чек-листов...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={checklists}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Чек-листов пока нет</Text>}
        contentContainerStyle={[styles.list, { paddingTop: 60 }]}
      />

      {/* FAB-кнопка */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>

      {/* Модальное окно создания чек-листа */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Новый чек-лист</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Название чек-листа"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus={true}
            />
{/* Переключатель "Чек-лист кофейни" */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Чек-лист кофейни</Text>
              <Switch
                value={isCoffeeShopChecklist}
                onValueChange={setIsCoffeeShopChecklist}
                trackColor={{ false: '#767577', true: '#f4511e' }}
                thumbColor={isCoffeeShopChecklist ? '#fff' : '#f4f3f4'}
              />
            </View>
            {/* Переключатель "с подразделами" */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Создать с подразделами</Text>
              <Switch
                value={withSubsections}
                onValueChange={setWithSubsections}
                trackColor={{ false: '#767577', true: '#f4511e' }}
                thumbColor={withSubsections ? '#fff' : '#f4f3f4'}
              />
            </View>

            {/* Если включены подразделы — поле для их добавления */}
            {withSubsections && (
              <View style={styles.subsectionInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Название подраздела"
                  value={newSubsectionTitle}
                  onChangeText={setNewSubsectionTitle}
                />
                <Pressable style={styles.addSubsectionBtn} onPress={addSubsection}>
                  <Ionicons name="add-circle" size={32} color="#f4511e" />
                </Pressable>
              </View>
            )}

            {/* Список уже добавленных подразделов */}
            {withSubsections && subsections.length > 0 && (
              <View style={styles.subsectionsList}>
                {subsections.map((sub, index) => (
                  <Text key={index} style={styles.subsectionItem}>
                    • {sub.title}
                  </Text>
                ))}
              </View>
            )}

            {/* Выбор дня недели */}
            <Text style={styles.modalLabel}>Повторять каждую неделю в день:</Text>
            <View style={styles.dayButtons}>
              {[
                { key: 'monday', ru: 'Пн' },
                { key: 'tuesday', ru: 'Вт' },
                { key: 'wednesday', ru: 'Ср' },
                { key: 'thursday', ru: 'Чт' },
                { key: 'friday', ru: 'Пт' },
                { key: 'saturday', ru: 'Сб' },
                { key: 'sunday', ru: 'Вс' },
              ].map(day => (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayButton, dueDay === day.key && styles.dayButtonActive]}
                  onPress={() => setDueDay(day.key)}
                >
                  <Text style={styles.dayButtonText}>{day.ru}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Выбор конкретной даты */}
            <Text style={styles.modalLabel}>Или конкретная дата:</Text>
            <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>
                {dueDate ? dueDate.toLocaleDateString('ru-RU') : 'Выбрать дату'}
              </Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDueDate(selectedDate);
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewTitle('');
                  setDueDay(null);
                  setDueDate(null);
                  setWithSubsections(false);
                  setSubsections([]);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.createButton]}
                onPress={addNewChecklist}
              >
                <Text style={styles.modalButtonText}>Создать</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  list: { paddingHorizontal: 16 },
  itemWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
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
  icon: { marginRight: 16 },
  textContainer: { flex: 1 },
  itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  dueLabel: { fontSize: 12, color: '#f4511e', marginTop: 4, fontStyle: 'italic' },
  progressText: { fontSize: 14, color: '#666', marginTop: 4 },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyText: { fontSize: 18, color: '#888', textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#f4511e',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  switchLabel: { fontSize: 16, color: '#333' },
  subsectionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addSubsectionBtn: {
    padding: 8,
  },
  subsectionsList: {
    width: '100%',
    marginBottom: 16,
  },
  subsectionItem: {
    fontSize: 14,
    color: '#555',
    marginVertical: 4,
  },
  modalLabel: {
    width: '100%',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  dayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
    margin: 4,
  },
  dayButtonActive: {
    backgroundColor: '#f4511e',
  },
  dayButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  dateButton: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  createButton: {
    backgroundColor: '#f4511e',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});