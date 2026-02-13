'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwrxeCi4LNyxoKlO-PP9WCkit53NRCDf64JG8diwRWfIVuYwUEWQwCugxhMoTS9ZLi5/exec'; // ← ВСТАВЬ НОВЫЙ URL

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [login, setLogin] = useState('');

  useEffect(() => {
    const authStr = localStorage.getItem('auth');
    if (!authStr) {
      router.push('/auth/login');
      return;
    }
    const auth = JSON.parse(authStr);
    setLogin(auth.login);
    fetchTasks(auth.login);
  }, [router]);

  const fetchTasks = async (login) => {
    setLoading(true);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getTasks',
          login: login
        })
      });

      const result = await res.json();
      console.log('Задачи из GAS:', result);

      if (result.error) {
        toast.error(result.error);
        setTasks([]);
      } else {
        setTasks(result);
      }
    } catch (e) {
      console.error(e);
      toast.error('Ошибка загрузки задач');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId) => {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'completeTask',
          login: login,
          taskId: taskId
        })
      });

      const result = await res.json();

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Выполнено!');
        fetchTasks(login); // обновляем список
      }
    } catch (e) {
      toast.error('Ошибка при отметке');
    }
  };

  const filteredTasks = showCompleted
    ? tasks
    : tasks.filter(t => t['Статус'] !== 'Выполнено');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-amber-700">Мои задачи</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition ${
                showCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showCompleted ? 'Скрыть выполненные' : 'Показать выполненные'}
            </button>
            <button
              onClick={() => fetchTasks(login)}
              className="flex items-center gap-2 px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
            <button
              onClick={() => router.push('/roznica/tasks/create')}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition"
            >
              <Plus className="w-5 h-5" />
              Создать
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xl text-gray-600">Загрузка задач...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-xl bg-white rounded-2xl shadow">
            {showCompleted ? 'Нет задач вообще' : 'Нет активных задач (все выполнены или нет новых)'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow border hover:shadow-xl transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">{task['Текст задачи'] || task.G}</h3>
                    <p className="text-gray-600 mt-2">{task['Описание'] || ''}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>Создана: {task['Дата создания'] || '—'}</span>
                      {task['Дата выполнения (план)'] && (
                        <span>Срок: {task['Дата выполнения (план)']}</span>
                      )}
                      {task['Дата фактического выполнения'] && (
                        <span className="text-green-600">
                          Выполнена: {task['Дата фактического выполнения']}
                        </span>
                      )}
                      {task['Приоритет'] && (
                        <span className={`font-medium px-2 py-1 rounded-full ${
                          task['Приоритет'] === 'Срочный' ? 'bg-red-100 text-red-700' :
                          task['Приоритет'] === 'Высокий' ? 'bg-orange-100 text-orange-700' :
                          task['Приоритет'] === 'Средний' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {task['Приоритет']}
                        </span>
                      )}
                    </div>
                  </div>

                  {task['Статус'] !== 'Выполнено' && (
                    <button
                      onClick={() => handleComplete(task['ID'] || i + 1)}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition ml-4 shrink-0"
                    >
                      Выполнено
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}