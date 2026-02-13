// src/api/api.js
import axios from 'axios';

const API_URL = 'http://192.168.31.184:3001/api'; // твой IP и порт

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export const getChecklists = async () => {
  const response = await api.get('/checklists');
  return response.data;
};

export const createChecklist = async (data) => {
  const response = await api.post('/checklists', data);
  return response.data;
};

export const updateChecklist = async (id, data) => {
  const response = await api.put(`/checklists/${id}`, data);
  return response.data;
};

export const deleteChecklist = async (id) => {
  await api.delete(`/checklists/${id}`);
};