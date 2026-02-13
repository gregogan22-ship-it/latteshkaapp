import axios from 'axios';

const API_URL = 'http://10.0.2.2:3001/api'; // Android эмулятор
// const API_URL = 'http://192.168.31.184:3001/api'; // если реальный телефон, подставь IP ПК

const api = axios.create({
  baseURL: 'http://192.168.31.184:3001/api',
  timeout: 30000,  // 30 секунд
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const getCashRegisters = async () => {
  const res = await api.get('/cash');
  return res.data;
};

export const createCashRegister = async (data) => {
  try {
    const response = await fetch('http://192.168.31.184:3001/api/cash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    console.log('Ответ fetch:', json);
    return json;
  } catch (err) {
    console.error('Fetch ошибка:', err.message);
    throw err;
  }
};