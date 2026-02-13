'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { CreditCard, UserPlus, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

export default function GuestRegistrationForm() {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [cardNumber, setCardNumber] = useState('');
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
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
console.log('Сохраняем в проект:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    e.preventDefault();

    if (!surname || !name || !phone || !coffeeShop || !consent) {
      return alert('Заполните все обязательные поля и выберите кофейню');
    }

    setLoading(true);

    let finalCardNumber = cardNumber;
    if (mode === 'new') {
      finalCardNumber = generateEAN13();
    }

    if (!/^\d{13}$/.test(finalCardNumber)) {
      alert('Номер карты должен состоять ровно из 13 цифр');
      setLoading(false);
      return;
    }

    const cleanPhone = '+7' + phone.replace(/\D/g, '').slice(1);

    try {
      console.log('Отправляем в API:', { phone: cleanPhone, card_number: finalCardNumber, coffee_shop: coffeeShop });

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
            birthday: birthday || null,
            coffee_shop: coffeeShop,
          },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error('Ошибка от API:', result);
        throw new Error(result.error || 'Неизвестная ошибка сервера');
      }

      console.log('УСПЕШНО! Ответ:', result);

      const qr = await QRCode.toDataURL(finalCardNumber, { width: 500 });
      setQrUrl(qr);
      setCardNumber(finalCardNumber);
      setSuccess(true);
    } catch (err: any) {
      console.error('Ошибка при сохранении:', err);
      alert('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-20">
      <div className="pt-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-10">

            {!success ? (
              <>
                <h1 className="text-4xl font-bold text-center text-purple-600 mb-10">
                  Регистрация карты гостя
                </h1>

                <form onSubmit={handleSubmit} className="space-y-8">

                  {/* Режим */}
                  <div className="grid grid-cols-2 gap-6">
                    <button
                      type="button"
                      onClick={() => { setMode('new'); setCardNumber(generateEAN13()); }}
                      className={`p-8 rounded-3xl border-4 transition-all ${mode === 'new' ? 'border-purple-600 bg-purple-50' : 'border-gray-300'}`}
                    >
                      <CreditCard className="w-20 h-20 mx-auto mb-4 text-purple-600" />
                      <p className="text-2xl font-bold">Новая карта</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('existing'); setCardNumber(''); }}
                      className={`p-8 rounded-3xl border-4 transition-all ${mode === 'existing' ? 'border-purple-600 bg-purple-50' : 'border-gray-300'}`}
                    >
                      <CreditCard className="w-20 h-20 mx-auto mb-4 text-purple-600" />
                      <p className="text-2xl font-bold">Существующая карта</p>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={mode === 'new' ? cardNumber : cardNumber}
                    onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    disabled={mode === 'new'}
                    className="w-full px-8 py-6 text-4xl font-mono text-center bg-gray-100 rounded-3xl"
                    placeholder="2000000000000"
                  />

                  <div className="grid md:grid-cols-3 gap-6">
                    <input required placeholder="Фамилия *" value={surname} onChange={e => setSurname(e.target.value)} className="px-8 py-6 border-2 rounded-3xl text-lg" />
                    <input required placeholder="Имя *" value={name} onChange={e => setName(e.target.value)} className="px-8 py-6 border-2 rounded-3xl text-lg" />
                    <input placeholder="Отчество" value={patronymic} onChange={e => setPatronymic(e.target.value)} className="px-8 py-6 border-2 rounded-3xl text-lg" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <input required type="tel" placeholder="Телефон *" value={phone} onChange={e => setPhone(e.target.value)} className="px-8 py-6 border-2 rounded-3xl text-lg" />
                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="px-8 py-6 border-2 rounded-3xl text-lg" />
                  </div>

                  <div>
                    <label className="block text-xl font-medium mb-4">Кофейня *</label>
                    <select
                      required
                      value={coffeeShop}
                      onChange={e => setCoffeeShop(e.target.value)}
                      className="w-full px-8 py-6 border-2 border-purple-300 rounded-3xl text-lg focus:border-purple-600"
                    >
                      <option value="">— Выберите кофейню —</option>
                      {COFFEE_SHOPS_LIST.map(shop => (
                        <option key={shop} value={shop}>{shop}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-start gap-4 cursor-pointer">
                    <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="w-8 h-8 mt-1 text-purple-600" />
                    <span className="text-lg text-gray-700">Согласен на обработку персональных данных</span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-3xl font-bold rounded-3xl hover:shadow-2xl transition disabled:opacity-70"
                  >
                    {loading ? 'Сохраняем...' : 'Зарегистрировать и показать QR'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-16">
                <CheckCircle className="w-32 h-32 text-green-500 mx-auto mb-8 animate-bounce" />
                <h2 className="text-4xl font-bold text-green-600 mb-8">Карта успешно выдана!</h2>
                <p className="text-3xl mb-6">{surname} {name} {patronymic && patronymic}</p>
                <p className="font-mono text-4xl bg-gray-100 px-10 py-6 rounded-3xl mb-12">{cardNumber}</p>
                <img src={qrUrl} alt="QR-код" className="mx-auto rounded-3xl shadow-2xl max-w-md mb-12" />
                <button
                  onClick={() => router.push('/guests/list')}
                  className="px-12 py-6 bg-purple-600 text-white text-2xl font-bold rounded-3xl hover:bg-purple-700 transition"
                >
                  Вернуться к списку гостей
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}