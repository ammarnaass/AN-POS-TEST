import { useState } from 'react';
import {
  Truck, Plus, Edit2, Trash2, Calendar, Clock, CheckCircle,
  XCircle, Filter, ChevronLeft, ChevronRight, Package, User, DollarSign
} from 'lucide-react';

const statusTabs = [
  { id: 'all', label: 'الكل' },
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'delivered', label: 'تم التسليم' },
  { id: 'cancelled', label: 'ملغاة' },
] as const;

type StatusTab = (typeof statusTabs)[number]['id'];

interface DeliveryOrder {
  id: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  deposit: number;
  remaining: number;
  deliveryDate: string;
  status: 'pending' | 'delivered' | 'cancelled';
}

const mockOrders: DeliveryOrder[] = [
  { id: 'DEL-001', date: '02-07-2026', customer: 'أحمد بن علي', items: 3, total: 45000, deposit: 15000, remaining: 30000, deliveryDate: '05-07-2026', status: 'pending' },
  { id: 'DEL-002', date: '01-07-2026', customer: 'مؤسسة الأمل', items: 1, total: 120000, deposit: 50000, remaining: 70000, deliveryDate: '04-07-2026', status: 'pending' },
  { id: 'DEL-003', date: '30-06-2026', customer: 'كريم بوعلام', items: 2, total: 25000, deposit: 25000, remaining: 0, deliveryDate: '02-07-2026', status: 'delivered' },
  { id: 'DEL-004', date: '29-06-2026', customer: 'شركة النور', items: 5, total: 89000, deposit: 30000, remaining: 59000, deliveryDate: '01-07-2026', status: 'cancelled' },
];

const statusBadge: Record<DeliveryOrder['status'], { label: string; className: string }> = {
  pending: { label: 'قيد الانتظار', className: 'bg-amber-500/20 text-amber-400' },
  delivered: { label: 'تم التسليم', className: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'ملغاة', className: 'bg-red-500/20 text-red-400' },
};

export default function DeliveryOrdersPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [orders, setOrders] = useState<DeliveryOrder[]>(mockOrders);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null);
  const [form, setForm] = useState({
    customer: '', items: '', total: '', deposit: '', deliveryDate: ''
  });

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const formatNumber = (n: number) => n.toLocaleString('ar-DZ');

  const handleSave = () => {
    if (!form.customer || !form.total) return;
    const total = Number(form.total) || 0;
    const deposit = Number(form.deposit) || 0;
    const newOrder: DeliveryOrder = {
      id: editingOrder?.id || `DEL-${String(orders.length + 1).padStart(3, '0')}`,
      date: new Date().toLocaleDateString('ar-DZ'),
      customer: form.customer,
      items: Number(form.items) || 1,
      total,
      deposit,
      remaining: total - deposit,
      deliveryDate: form.deliveryDate,
      status: 'pending',
    };
    if (editingOrder) {
      setOrders(orders.map(o => o.id === editingOrder.id ? { ...newOrder, status: editingOrder.status } : o));
    } else {
      setOrders([newOrder, ...orders]);
    }
    setShowForm(false);
    setEditingOrder(null);
    setForm({ customer: '', items: '', total: '', deposit: '', deliveryDate: '' });
  };

  const handleDelete = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  const handleStatusChange = (id: string, status: DeliveryOrder['status']) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const openEdit = (order: DeliveryOrder) => {
    setEditingOrder(order);
    setForm({
      customer: order.customer,
      items: String(order.items),
      total: String(order.total),
      deposit: String(order.deposit),
      deliveryDate: order.deliveryDate,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <Truck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface font-cairo">طلبات التوصيل</h1>
              <p className="text-sm text-on-surface-variant">ادارة طلبات الزبائن وتتبع العربون والتسليم</p>
            </div>
          </div>
          <button onClick={() => { setEditingOrder(null); setForm({ customer: '', items: '', total: '', deposit: '', deliveryDate: '' }); setShowForm(true); }}
            className="btn-primary">
            <Plus className="w-4 h-4" /> طلب جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-sm text-on-surface-variant">قيد الانتظار</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{orders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-on-surface-variant">تم التسليم</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{orders.filter(o => o.status === 'delivered').length}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <DollarSign className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-sm text-on-surface-variant">اجمالي المتبقي</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{formatNumber(orders.filter(o => o.status === 'pending').reduce((s, o) => s + o.remaining, 0))} دج</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-high p-1.5 rounded-xl overflow-x-auto border border-outline-variant/20">
        {statusTabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">رقم الطلب</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">الزبون</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">المنتجات</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">المبلغ الكلي</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">العربون</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">المتبقي</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">تاريخ التسليم</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-outline-variant/20/30 hover:bg-surface-container-high transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-on-surface">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{order.customer}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{order.items} منتج</td>
                  <td className="px-6 py-4 text-sm font-medium text-on-surface">{formatNumber(order.total)} دج</td>
                  <td className="px-6 py-4 text-sm font-medium text-emerald-400">{formatNumber(order.deposit)} دج</td>
                  <td className="px-6 py-4 text-sm font-medium text-red-400">{formatNumber(order.remaining)} دج</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{order.deliveryDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[order.status].className}`}>
                      {statusBadge[order.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(order)} className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"><Edit2 className="w-4 h-4" /></button>
                      {order.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatusChange(order.id, 'delivered')} className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => handleStatusChange(order.id, 'cancelled')} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => handleDelete(order.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
            <Truck className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-sm">لا توجد طلبات</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-on-surface font-cairo">{editingOrder ? 'تعديل الطلب' : 'طلب توصيل جديد'}</h3>
              <button onClick={() => { setShowForm(false); setEditingOrder(null); }} className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-on-surface-variant mb-2">اسم الزبون</label>
                <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-2">عدد المنتجات</label>
                  <input type="number" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })}
                    className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-2">المبلغ الكلي</label>
                  <input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })}
                    className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-2">العربون</label>
                  <input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                    className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant mb-2">تاريخ التسليم</label>
                  <input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className="bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave}
                className="flex-1 btn-primary">
                {editingOrder ? 'حفظ التعديلات' : 'اضافة الطلب'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingOrder(null); }}
                className="px-6 py-3 text-on-surface-variant hover:text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-high transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
