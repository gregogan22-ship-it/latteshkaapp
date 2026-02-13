'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Coffee, User, Phone, Mail, Heart, CheckCircle } from 'lucide-react';

export default function GuestForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    favorite_drink: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('guests')
      .insert({
        name: formData.name,
        phone: formData.phone.replace(/\D/g, ''),
        email: formData.email,
        birthday: formData.birthday || null,
        favorite_drink: formData.favorite_drink || null,
        registered_at: new Date().toISOString(),
      });

    setLoading(false);
    if (error) {
      alert('Ошибка отправки. Попробуйте позже.');
      console.error(error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full"
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Спасибо!</h2>
          <p className="text-lg text-gray-600 mb-8">
            {formData.name}, ваша карта гостя успешно зарегистрирована! ☕
          </p>
          <div className="text-6xl">❤️</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <Coffee className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Станьте нашим гостем</h1>
          <p className="text-gray-600 mt-2">Заполните анкету и получите карту лояльности</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-3 mb-2 text-gray-700 font-medium">
              <User className="w-5 h-5" /> Имя
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition"
              placeholder="Анна"
            />
          </div>

          <div>
            <label className="flex items-center gap-3 mb-2 text-gray-700 font-medium">
              <Phone className="w-5 h-5" /> Телефон
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div>
            <label className="flex items-center gap-3 mb-2 text-gray-700 font-medium">
              <Mail className="w-5 h-5" /> Email (по желанию)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
              placeholder="anna@example.com"
            />
          </div>

          <div>
            <label className="flex items-center gap-3 mb-2 text-gray-700 font-medium">
              <Heart className="w-5 h-5" /> Любимый напиток
            </label>
            <input
              type="text"
              value={formData.favorite_drink}
              onChange={e => setFormData({ ...formData, favorite_drink: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
              placeholder="Латте с корицей"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xl rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition disabled:opacity-70"
          >
            {loading ? 'Отправляем...' : 'Получить карту гостя ❤️'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-8">
          Ваши данные защищены. Мы не передаём их третьим лицам.
        </p>
      </motion.div>
    </div>
  );
}