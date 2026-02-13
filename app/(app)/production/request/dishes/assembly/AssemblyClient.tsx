'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageCheck,
  Clock,
  X,
  Plus,
  Minus,
  CheckCircle2,
  ShoppingCart,
  Coffee,
  ChevronDown,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// === ТИПЫ ===
type Item = { name: string; quantity: number };
type ReportItem = { name: string; requested: number; actual: number; missing: boolean };
type CoffeeShop = { id: string; name: string };
type Dish = { id: string; name: string };
type BaseOperation = {
  id: string;
  number?: string;
  coffee_shop?: string;
  from_shop?: string;
  to_shop?: string;
  items: Item[];
  items_count: number;
  status: 'new' | 'in_progress' | 'partial' | 'done' | 'canceled';
  worker?: string | null;
  report?: ReportItem[] | null;
  created_at: string;
  source?: 'app' | 'telegram';
  pending_update?: any;
  pending_since?: string | null;
  type: 'assembly' | 'transfer';
};
type AssemblyRequest = BaseOperation & { type: 'assembly' };
type Transfer = BaseOperation & { type: 'transfer' };
type Operation = AssemblyRequest | Transfer;

async function getSalesForShop(shopName: string): Promise<Record<string, number>> {
  if (!shopName) return {};
  try {
    const { data, error } = await supabase.from('dish_sales').select('*');
    if (error || !data) return {};
    const result: Record<string, number> = {};
    data.forEach(row => {
      const dish = row.dish_name;
      const sales = row[shopName];
      if (dish && sales !== undefined) result[dish] = Number(sales) || 0;
    });
    return result;
  } catch (err) {
    console.error('Ошибка загрузки продаж:', err);
    return {};
  }
}

export default function AssemblyClient() {
  const [operationType, setOperationType] = useState<'assembly' | 'transfer'>('assembly');
  const [fromShop, setFromShop] = useState('');
  const [toShop, setToShop] = useState('');
  const [fromShopSearch, setFromShopSearch] = useState('');
  const [toShopSearch, setToShopSearch] = useState('');
  const [requests, setRequests] = useState<Operation[]>([]);
  const [coffeeShops, setCoffeeShops] = useState<CoffeeShop[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'partial' | 'pending' | 'archive'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterShop, setFilterShop] = useState('');
  const [filterDish, setFilterDish] = useState('');
  const [viewMode, setViewMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShop, setNewShop] = useState('');
  const [newItems, setNewItems] = useState<Record<string, number>>({});
  const [shopSearch, setShopSearch] = useState('');
  const [dishSearch, setDishSearch] = useState('');
  const [currentShopSales, setCurrentShopSales] = useState<Record<string, number>>({});

  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartItemsCount = Object.values(newItems).reduce((a, b) => a + b, 0);
  const currentShopName =
    operationType === 'transfer'
      ? `${coffeeShops.find(s => s.id === fromShop)?.name || 'Откуда'} → ${coffeeShops.find(s => s.id === toShop)?.name || 'Куда'}`
      : coffeeShops.find(s => s.id === newShop)?.name || 'Кофейня не выбрана';

  const cartItems = Object.entries(newItems)
    .filter(([_, q]) => q > 0)
    .map(([id, q]) => ({ dish: dishes.find(d => d.id === id), qty: q }))
    .filter(i => i.dish);

  useEffect(() => {
    const shopName = coffeeShops.find(s => s.id === newShop)?.name;
    if (shopName) {
      getSalesForShop(shopName).then(setCurrentShopSales);
    } else {
      setCurrentShopSales({});
    }
  }, [newShop, coffeeShops]);

  const loadReferences = async () => {
    const [shopsRes, dishesRes] = await Promise.all([
      supabase.from('coffee_shops').select('id, name').order('name'),
      supabase.from('dishes').select('id, name').order('name'),
    ]);
    setCoffeeShops(shopsRes.data || []);
    setDishes(dishesRes.data || []);
  };

  const fetchRequests = async () => {
    try {
      const { data: assemblyData } = await supabase
        .from('assembly_requests')
        .select('*')
        .order('created_at', { ascending: false });
      const { data: transferData } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      const assemblyRequests = (assemblyData || []).map(r => ({ ...r, type: 'assembly' as const }));
      const transfers = (transferData || []).map(t => ({
        ...t,
        type: 'transfer' as const,
        number: `ПЕРЕМЕЩЕНИЕ #${t.id}`,
        coffee_shop: `${t.from_shop} → ${t.to_shop}`,
        status: t.status || 'new',
      }));

      const all = [...assemblyRequests, ...transfers].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRequests(all);
      setPendingCount(all.filter(r => r.status === 'new').length);
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка:', err);
      setIsLoading(false);
    }
  };

  const createRequest = async () => {
    if (!newShop) return toast.error('Выберите кофейню');
    if (Object.values(newItems).filter(q => q > 0).length === 0) return toast.error('Выберите блюда');

    const items = Object.entries(newItems)
      .filter(([_, q]) => q > 0)
      .map(([id, q]) => {
        const dish = dishes.find(d => d.id === id);
        return { name: dish!.name, quantity: q };
      });

    const payload = {
      number: `APP-${Date.now().toString().slice(-6)}`,
      coffee_shop: coffeeShops.find(s => s.id === newShop)?.name || '',
      items,
      items_count: items.reduce((a, b) => a + b.quantity, 0),
      status: 'new',
      worker: null,
      report: null,
      source: 'app',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('assembly_requests').insert(payload);
    if (error) {
      toast.error('Ошибка при создании заявки');
      return;
    }
    toast.success('Заявка создана!');
    setShowCreateModal(false);
    setNewShop('');
    setNewItems({});
    setShopSearch('');
    setDishSearch('');
    fetchRequests();
  };

  const createTransfer = async () => {
    if (!fromShop || !toShop || fromShop === toShop) return toast.error('Выберите разные точки');
    if (Object.values(newItems).filter(q => q > 0).length === 0) return toast.error('Выберите блюда');

    const items = Object.entries(newItems)
      .filter(([_, q]) => q > 0)
      .map(([id, q]) => {
        const dish = dishes.find(d => d.id === id);
        return { name: dish!.name, quantity: q };
      });

    const payload = {
      from_shop: coffeeShops.find(s => s.id === fromShop)?.name || '',
      to_shop: coffeeShops.find(s => s.id === toShop)?.name || '',
      items,
      items_count: items.reduce((a, b) => a + b.quantity, 0),
      status: 'new',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('transfers').insert(payload);
    if (error) {
      toast.error('Ошибка: ' + error.message);
      return;
    }
    toast.success('Перемещение создано!');
    setShowCreateModal(false);
    setFromShop('');
    setToShop('');
    setNewItems({});
    setFromShopSearch('');
    setToShopSearch('');
    setDishSearch('');
    fetchRequests();
  };

  const confirmTake = () => {
    toast.success('Дособор подтверждён!');
    setViewMode(true);
  };

  const openModal = (req: Operation) => {
    setSelected(req);
    setViewMode(false);
    setQuantities({});
  };
  const todayStats = {
    total: requests.length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'done').length,
  };

  const filtered = requests.filter(req => {
    if (filterDate && new Date(req.created_at).toISOString().slice(0, 10) !== filterDate) return false;
    if (filterShop && req.coffee_shop !== filterShop) return false;
    if (filterDish && !req.items.some(i => i.name.toLowerCase().includes(filterDish.toLowerCase()))) return false;
    if (tab === 'partial') return req.status === 'partial';
    if (tab === 'pending') return req.status === 'new';
    return true;
  });

  useEffect(() => {
    loadReferences();
    fetchRequests();
    const interval = setInterval(fetchRequests, 12000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl text-gray-600">Загрузка...</p>
      </div>
    );
  }

  return (
    <>
      {/* Корзина в правом верхнем углу */}
      <div className="fixed top-4 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 min-w-64"
        >
          <ShoppingCart className="w-8 h-8" />
          <div className="text-left">
            <p className="text-xs opacity-90 truncate max-w-48">{currentShopName}</p>
            <p className="font-bold text-lg">
              {cartItemsCount > 0 ? `${cartItemsCount} шт.` : 'Пусто'}
            </p>
          </div>
          {cartItemsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center">
              {cartItemsCount}
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {isCartOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-20 right-0 w-80 bg-white rounded-2xl shadow-2xl border overflow-hidden"
            >
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4 flex justify-between items-center">
                <h3 className="font-bold">Корзина</h3>
                <button onClick={() => setIsCartOpen(false)} className="hover:bg-white/20 rounded-lg p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-4 space-y-3">
                {cartItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Корзина пуста</p>
                ) : (
                  cartItems.map(({ dish, qty }) => dish && (
                    <div key={dish.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <span className="font-medium truncate pr-2">{dish.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNewItems(p => ({ ...p, [dish.id]: Math.max(0, qty - 1) }))}
                          className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 font-bold"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-bold">{qty}</span>
                        <button
                          onClick={() => setNewItems(p => ({ ...p, [dish.id]: qty + 1 }))}
                          className="w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 text-green-700 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cartItemsCount > 0 && (
                <div className="border-t p-4 bg-gray-50">
                  <button
                    onClick={operationType === 'transfer' ? createTransfer : createRequest}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-4 rounded-xl font-bold hover:opacity-90 transition"
                  >
                    Отправить заявку ({cartItemsCount} шт.)
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Основной контент */}
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-4xl mx-auto p-6">
          {/* Заголовок */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-amber-700">Заявки на сборку</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Новая
            </button>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-amber-500">
              <p className="text-3xl font-bold text-amber-700">{todayStats.total}</p>
              <p className="text-xs text-gray-600">Всего</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
              <p className="text-3xl font-bold text-blue-700">{todayStats.inProgress}</p>
              <p className="text-xs text-gray-600">В работе</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
              <p className="text-3xl font-bold text-green-700">{todayStats.completed}</p>
              <p className="text-xs text-gray-600">Готово</p>
            </div>
          </div>

          {/* Фильтры */}
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border rounded-lg px-3 py-2" />
              <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="border rounded-lg px-3 py-2">
                <option value="">Все кофейни</option>
                {Array.from(new Set(requests.map(r => r.coffee_shop))).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Блюдо..."
                value={filterDish}
                onChange={e => setFilterDish(e.target.value)}
                className="border rounded-lg px-3 py-2 col-span-2"
              />
              <button onClick={() => { setFilterDate(''); setFilterShop(''); setFilterDish(''); }} className="col-span-2 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg">
                Сбросить
              </button>
            </div>
          </div>

          {/* Вкладки */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {(['all', 'partial', 'pending', 'archive'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg font-medium whitespace-nowrap ${tab === t ? 'bg-amber-600 text-white' : 'bg-white border'}`}
              >
                {t === 'all' && `Все (${requests.length})`}
                {t === 'partial' && `Недособрано (${requests.filter(r => r.status === 'partial').length})`}
                {t === 'pending' && `Не отправлено (${pendingCount})`}
                {t === 'archive' && 'Архив'}
              </button>
            ))}
          </div>

          {/* Список заявок */}
          <div className="space-y-0">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg">Заявок нет</p>
              </div>
            ) : (
              filtered.map(req => {
                const isTransfer = req.type === 'transfer';
                const isPending = !!req.pending_update;
                return (
                  <div
                    key={req.id}
                    onClick={() => openModal(req)}
                    className={`border-b border-gray-200 px-4 py-4 hover:bg-gray-50 transition ${
                      isPending ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isTransfer && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                              ПЕРЕМЕЩЕНИЕ
                            </span>
                          )}
                          <h3 className="font-semibold text-gray-900 truncate">
                            {isTransfer
                              ? `${req.from_shop} → ${req.to_shop}`
                              : req.coffee_shop}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span className="font-medium">№{req.number || req.id}</span>
                          <span>•</span>
                          <span>{new Date(req.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span className="font-medium">{req.items_count} поз.</span>
                        </div>
                        {req.worker && (
                          <p className="text-xs text-gray-500 mt-1">👤 {req.worker}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isPending && (
                          <span className="text-xs text-orange-600 font-bold animate-pulse">
                            ОЖИДАЕТ
                          </span>
                        )}
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          req.status === 'done' ? 'bg-green-100 text-green-700' :
                          req.status === 'partial' ? 'bg-red-100 text-red-700' :
                          req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {req.status === 'done' ? 'Готово' :
                           req.status === 'partial' ? 'Частично' :
                           req.status === 'in_progress' ? 'В работе' : 'Новая'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
                    {/* Модалка создания новой операции */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex flex-col bg-white">
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <h2 className="text-xl font-bold">Новая операция</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewShop('');
                    setNewItems({});
                    setShopSearch('');
                    setDishSearch('');
                    setFromShop('');
                    setToShop('');
                    setFromShopSearch('');
                    setToShopSearch('');
                    setOperationType('assembly');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 border-b bg-gray-50">
                <div className="flex gap-3">
                  <button
                    onClick={() => setOperationType('assembly')}
                    className={`flex-1 py-3 rounded-xl font-bold transition ${
                      operationType === 'assembly'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border-2 border-gray-300 text-gray-700'
                    }`}
                  >
                    Заявка на сборку
                  </button>
                  <button
                    onClick={() => setOperationType('transfer')}
                    className={`flex-1 py-3 rounded-xl font-bold transition ${
                      operationType === 'transfer'
                        ? 'bg-green-600 text-white'
                        : 'bg-white border-2 border-gray-300 text-gray-700'
                    }`}
                  >
                    Перемещение
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pb-40">
                <div className="p-4 space-y-6">
                  {operationType === 'transfer' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Откуда</label>
                        <input
                          type="text"
                          placeholder="Поиск кофейни..."
                          value={coffeeShops.find(s => s.id === fromShop)?.name || fromShopSearch}
                          onChange={(e) => setFromShopSearch(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500"
                        />
                        {fromShopSearch && (
                          <div className="mt-2 max-h-48 overflow-y-auto border rounded-xl bg-white shadow-lg">
                            {coffeeShops
                              .filter(shop => shop.name.toLowerCase().includes(fromShopSearch.toLowerCase()))
                              .map(shop => (
                                <div
                                  key={shop.id}
                                  onClick={() => {
                                    setFromShop(shop.id);
                                    setFromShopSearch('');
                                  }}
                                  className="px-4 py-3 hover:bg-green-50 cursor-pointer font-medium"
                                >
                                  {shop.name}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Куда</label>
                        <input
                          type="text"
                          placeholder="Поиск кофейни..."
                          value={coffeeShops.find(s => s.id === toShop)?.name || toShopSearch}
                          onChange={(e) => setToShopSearch(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500"
                        />
                        {toShopSearch && (
                          <div className="mt-2 max-h-48 overflow-y-auto border rounded-xl bg-white shadow-lg">
                            {coffeeShops
                              .filter(shop => shop.name.toLowerCase().includes(toShopSearch.toLowerCase()))
                              .map(shop => (
                                <div
                                  key={shop.id}
                                  onClick={() => {
                                    setToShop(shop.id);
                                    setToShopSearch('');
                                  }}
                                  className="px-4 py-3 hover:bg-green-50 cursor-pointer font-medium"
                                >
                                  {shop.name}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">Кофейня</label>
                      <input
                        type="text"
                        placeholder="Поиск кофейни..."
                        value={coffeeShops.find(s => s.id === newShop)?.name || shopSearch}
                        onChange={(e) => setShopSearch(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-amber-500"
                      />
                      {shopSearch && (
                        <div className="mt-2 max-h-48 overflow-y-auto border rounded-xl bg-white shadow-lg">
                          {coffeeShops
                            .filter(shop => shop.name.toLowerCase().includes(shopSearch.toLowerCase()))
                            .map(shop => (
                              <div
                                key={shop.id}
                                onClick={() => {
                                  setNewShop(shop.id);
                                  setShopSearch('');
                                }}
                                className="px-4 py-3 hover:bg-amber-50 cursor-pointer font-medium"
                              >
                                {shop.name}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Добавить блюдо</label>
                    <input
                      type="text"
                      placeholder="Поиск блюда..."
                      value={dishSearch}
                      onChange={(e) => setDishSearch(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-3 focus:border-amber-500"
                    />
                  </div>

                  {dishSearch && dishes
                    .filter(dish => dish.name.toLowerCase().includes(dishSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(dish => {
                      const qty = newItems[dish.id] || 0;
                      const avgSales = currentShopSales[dish.name] || 0;
                      const salesText = avgSales > 0 ? `${avgSales.toFixed(1)} шт/день` : '—';
                      const salesColor = avgSales > 20 ? 'text-green-600 font-bold'
                                      : avgSales > 10 ? 'text-yellow-600 font-bold'
                                      : 'text-gray-500';
                      return (
                        <div key={dish.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                          <div className="flex-1 pr-3">
                            <p className="text-sm font-medium text-gray-800">{dish.name}</p>
                            <p className={`text-xs ${salesColor} mt-1`}>
                              Средние продажи: {salesText}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setNewItems(p => ({ ...p, [dish.id]: Math.max(0, qty - 1) }))}
                              className="w-10 h-10 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xl transition"
                            >
                              −
                            </button>
                            <span className="w-14 text-center font-bold text-xl text-gray-800">
                              {qty}
                            </span>
                            <button
                              onClick={() => setNewItems(p => ({ ...p, [dish.id]: qty + 1 }))}
                              className="w-10 h-10 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 font-bold text-xl transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Нижняя часть модалки создания */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-3 shadow-2xl">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewShop('');
                    setNewItems({});
                    setShopSearch('');
                    setDishSearch('');
                    setFromShop('');
                    setToShop('');
                    setOperationType('assembly');
                  }}
                  className="flex-1 py-3 bg-white border-2 border-gray-300 rounded-xl font-bold text-base"
                >
                  Отмена
                </button>
                <button
                  onClick={operationType === 'transfer' ? createTransfer : createRequest}
                  disabled={
                    (operationType === 'assembly' && !newShop) ||
                    (operationType === 'transfer' && (!fromShop || !toShop || fromShop === toShop)) ||
                    Object.values(newItems).filter(q => q > 0).length === 0
                  }
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-xl text-base"
                >
                  {operationType === 'transfer' ? 'Переместить' : 'Создать заявку'}
                </button>
              </div>
            </div>
          )}

          {/* Модалка просмотра и дособора */}
          {selected && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl max-h-screen overflow-y-auto"
              >
                <div className="flex items-center justify-between p-6 border-b bg-gray-50">
                  <h2 className="text-2xl font-bold">
                    {selected.type === 'transfer' ? 'Перемещение' : 'Заявка на сборку'}
                  </h2>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setViewMode(false);
                      setQuantities({});
                    }}
                    className="p-2 hover:bg-gray-200 rounded-xl"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {selected.items.map((item, idx) => {
                    const actual = selected.report?.find(r => r.name === item.name)?.actual || 0;
                    const missing = actual < item.quantity;
                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl border-2 transition-all ${
                          missing
                            ? 'bg-red-50 border-red-400 shadow-red-100'
                            : 'bg-green-50 border-green-400 shadow-green-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-lg font-bold text-gray-800">{item.name}</p>
                          {missing ? (
                            <span className="text-red-600 font-bold text-sm">
                              Не хватает {item.quantity - actual}
                            </span>
                          ) : (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">Запрошено:</span>
                          <span className="font-bold text-gray-900">{item.quantity}</span>
                          <span className="text-gray-600 mx-2">→</span>
                          <span className="text-gray-600">Собрано:</span>
                          <span className="font-bold text-gray-900">{actual}</span>
                        </div>
                        {!viewMode && missing && (
                          <input
                            type="number"
                            min={actual}
                            max={item.quantity}
                            value={quantities[idx] ?? actual}
                            onChange={(e) =>
                              setQuantities((p) => ({
                                ...p,
                                [idx]: Math.min(item.quantity, Math.max(actual, Number(e.target.value) || actual)),
                              }))
                            }
                            className="mt-4 w-full px-4 py-3 border-2 border-red-500 rounded-xl text-center font-bold text-red-700 bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-200"
                            placeholder="Укажи количество"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 bg-white border-t p-6 flex gap-4">
                  <button
                    onClick={() => {
                      setSelected(null);
                      setViewMode(false);
                      setQuantities({});
                    }}
                    className="flex-1 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Закрыть
                  </button>

                  {!viewMode &&
                    selected.items.some((item) => {
                      const actual = selected.report?.find((r) => r.name === item.name)?.actual || 0;
                      return actual < item.quantity;
                    }) && (
                      <button
                        onClick={confirmTake}
                        className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition"
                      >
                        Подтвердить досбор
                      </button>
                    )}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      <Toaster position="top-center" />
    </>
  );
}