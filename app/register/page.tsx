'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { CreditCard, CheckCircle } from 'lucide-react';
import { COFFEE_SHOPS_LIST } from '@/lib/coffeeShops';

function generateEAN13(): string {
  const rand = () => Math.floor(Math.random() * 10);
  let num = '200';
  for (let i = 0; i < 9; i++) num += rand();
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(num[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return num + check;
}

export default function GuestRegistration() {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [cardNumber, setCardNumber] = useState(generateEAN13());
  const [surname, setSurname] = useState('');
  const [name, setName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [coffeeShop, setCoffeeShop] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [timer, setTimer] = useState(10);

  // Таймер обратного отсчёта 60 секунд после успешной регистрации
useEffect(() => {
  if (!success) return;

  setTimer(60); // начинаем с 60 секунд

  const interval = setInterval(() => {
    setTimer((prev) => {
      if (prev <= 1) {
        handleNewRegistration();
        clearInterval(interval); // очищаем интервал, чтобы не запускался повторно
        return 60; // или можно return 0, если не планируете перезапуск
      }
      return prev - 1;
    });
  }, 1000);

  // Очистка при размонтировании или при новом success
  return () => clearInterval(interval);
}, [success]);

  const handleNewRegistration = () => {
    setSuccess(false);
    setMode('new');
    setCardNumber(generateEAN13());
    setSurname('');
    setName('');
    setPatronymic('');
    setPhone('');
    setBirthday('');
    setCoffeeShop('');
    setConsent(false);
    setQrUrl('');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.startsWith('8')) return '+7' + digits.slice(1);
    if (digits.startsWith('7')) return '+' + digits;
    return '+7' + digits.slice(1);
  };

  const formatBirthday = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length >= 3) formatted += '.' + digits.slice(2, 4);
    if (digits.length >= 5) formatted += '.' + digits.slice(4, 8);
    return formatted.slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!surname.trim()) return alert('Введите фамилию');
    if (!name.trim()) return alert('Введите имя');
    if (!phone || phone.replace(/\D/g, '').length !== 11) return alert('Введите корректный телефон');
    if (!birthday || birthday.length !== 10) return alert('Введите дату рождения (ДД.ММ.ГГГГ)');
    if (!coffeeShop) return alert('Выберите кофейню');
    if (!consent) return alert('Необходимо согласие на обработку данных');

    setLoading(true);
    let finalCardNumber = cardNumber;
    if (mode === 'new') finalCardNumber = generateEAN13();

    if (!/^\d{13}$/.test(finalCardNumber)) {
      alert('Номер карты должен состоять из 13 цифр');
      setLoading(false);
      return;
    }

    const cleanPhone = '+7' + phone.replace(/\D/g, '').slice(1);

    try {
      const res = await fetch('/api/register-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          card_number: finalCardNumber,
          data: {
            surname: surname.trim(),
            name: name.trim(),
            patronymic: patronymic.trim() || null,
            birthday,
            coffee_shop: coffeeShop,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Ошибка сервера');

      const qr = await QRCode.toDataURL(finalCardNumber, { width: 600 });
      setQrUrl(qr);
      setCardNumber(finalCardNumber);
      setSuccess(true);
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Успешный экран
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center max-w-lg w-full">
          <CheckCircle className="w-20 h-20 sm:w-24 sm:h-24 text-green-500 mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl sm:text-4xl font-bold text-green-600 mt-6 mb-6">Готово!</h2>
          <p className="text-xl sm:text-2xl mb-4">{surname} {name}</p>
          <p className="text-4xl sm:text-5xl font-mono bg-gray-100 py-5 sm:py-6 rounded-2xl mb-8 tracking-widest">
            {cardNumber}
          </p>
          <img src={qrUrl} alt="QR-код карты" className="mx-auto rounded-2xl shadow-xl mb-8 max-w-72 w-full" />
          <p className="text-lg sm:text-xl text-gray-700 mb-8">
            Покажите этот QR-код кассиру при следующем визите
          </p>
          <p className="text-4xl mb-6">❤️</p>

          <button
            onClick={handleNewRegistration}
            className="w-full py-5 sm:py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl sm:text-2xl font-bold rounded-3xl hover:shadow-2xl transition"
          >
            Оформить ещё одну карту
          </button>
          <p className="mt-6 text-gray-600">
            Новая форма через <span className="font-bold text-purple-600 text-3xl">{timer}</span> сек...
          </p>
        </div>
      </div>
    );
  }

  // Основная форма
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-10 max-w-2xl w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-purple-600 mb-8 sm:mb-10">
          Способ регистрации карт лояльности на ваш выбор</h1>

        <form onSubmit={handleSubmit} className="space-y-7 sm:space-y-8">

          {/* Выбор режима — адаптивные карточки */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => {
                setMode('new');
                setCardNumber(generateEAN13());
              }}
              className={`
                relative p-6 sm:p-10 rounded-3xl border-4 transition-all duration-300
                flex flex-col items-center justify-center text-center
                min-h-44 sm:min-h-0
                ${mode === 'new'
                  ? 'border-purple-600 bg-purple-50 shadow-xl scale-105'
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <CreditCard className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-purple-600" />
              <p className="text-lg sm:text-2xl font-bold leading-tight px-2">
                Оформить <br className="sm:hidden" />
                виртуальную <br />
                карту в виде QR-кода
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('existing');
                setCardNumber('');
              }}
              className={`
                relative p-6 sm:p-10 rounded-3xl border-4 transition-all duration-300
                flex flex-col items-center justify-center text-center
                min-h-44 sm:min-h-0
                ${mode === 'existing'
                  ? 'border-purple-600 bg-purple-50 shadow-xl scale-105'
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <CreditCard className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-purple-600" />
              <p className="text-lg sm:text-2xl font-bold leading-tight px-2">
                Активируйте <br className="sm:hidden" />
                физическую карту <br />
                выданную кассиром
              </p>
            </button>
          </div>

          {/* Номер карты */}
          <input
            type="text"
            value={mode === 'new' ? cardNumber : cardNumber}
            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
            disabled={mode === 'new'}
            className="w-full px-6 py-5 text-3xl sm:text-4xl font-mono text-center bg-gray-100 rounded-3xl tracking-widest"
            placeholder="2000000000000"
          />

          {/* ФИО */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
            <input required placeholder="Фамилия *" value={surname} onChange={(e) => setSurname(e.target.value)}
              className="px-6 py-5 border-2 border-gray-300 rounded-3xl text-lg focus:border-purple-500 outline-none" />
            <input required placeholder="Имя *" value={name} onChange={(e) => setName(e.target.value)}
              className="px-6 py-5 border-2 border-gray-300 rounded-3xl text-lg focus:border-purple-500 outline-none" />
            <input placeholder="Отчество" value={patronymic} onChange={(e) => setPatronymic(e.target.value)}
              className="px-6 py-5 border-2 border-gray-300 rounded-3xl text-lg focus:border-purple-500 outline-none" />
          </div>

          <input
            required
            type="tel"
            placeholder="Телефон *"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="w-full px-6 py-5 border-2 border-gray-300 rounded-3xl text-lg focus:border-purple-500 outline-none"
          />

          <input
            required
            type="text"
            placeholder="Дата рождения * (ДД.ММ.ГГГГ)"
            value={birthday}
            onChange={(e) => setBirthday(formatBirthday(e.target.value))}
            maxLength={10}
            className="w-full px-6 py-5 border-2 border-gray-300 rounded-3xl text-lg focus:border-purple-500 outline-none"
          />

          <select
            required
            value={coffeeShop}
            onChange={(e) => setCoffeeShop(e.target.value)}
            className="w-full px-6 py-5 border-2 border-purple-300 rounded-3xl text-lg focus:border-purple-600 outline-none"
          >
            <option value="">Адрес кофейни *</option>
            {COFFEE_SHOPS_LIST.map((shop) => (
              <option key={shop} value={shop}>{shop}</option>
            ))}
          </select>

          <label className="flex items-start gap-4 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-7 h-7 mt-0.5 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-base sm:text-lg text-gray-700">
              Согласен на обработку персональных данных *
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 sm:py-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-2xl sm:text-3xl font-bold rounded-3xl hover:shadow-2xl transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Сохраняем...' : 'Зарегистрировать и получить QR-код'}
          </button>
        </form>
      </div>
    </div>
  );
}