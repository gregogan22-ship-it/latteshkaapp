import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, TextInput } from 'react-native';
import { getCashRegisters, createCashRegister } from '../api/api';

const CashListScreen = () => {
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  useEffect(() => {
    fetchRegisters();
  }, []);

  const fetchRegisters = async () => {
    try {
      const data = await getCashRegisters();
      setRegisters(data);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось загрузить кассы');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addCashRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название кассы');
      return;
    }

    try {
      const newReg = await createCashRegister({
        name: name.trim(),
        balance: parseFloat(balance) || 0,
        currency: 'PLN',
      });
      setRegisters([...registers, newReg]);
      setName('');
      setBalance('');
      Alert.alert('Успех', 'Касса добавлена!');
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось добавить кассу');
      console.error(err);
    }
  };

  if (loading) return <Text>Загрузка...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Список касс</Text>

      <FlatList
        data={registers}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.name} — {item.balance} {item.currency}</Text>
            {item.description && <Text style={styles.desc}>{item.description}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text>Касс пока нет</Text>}
      />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Название кассы"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Начальный баланс (число)"
          value={balance}
          onChangeText={setBalance}
          keyboardType="numeric"
        />
        <Button title="Добавить кассу" onPress={addCashRegister} />
      </View>

      <Button title="Обновить список" onPress={fetchRegisters} color="gray" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#ddd' },
  desc: { color: 'gray', fontSize: 12 },
  form: { marginTop: 20, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default CashListScreen;