// PrintersPage — POS-PRINT-001 / FR-013 → FR-017
// إدارة الطابعات: قائمة + إضافة/تعديل + اكتشاف USB/Bluetooth + اختبار + تحديث الحالة + تعيينات
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit2, Trash2, Star, RefreshCw, Printer as PrinterIcon,
  Usb, Bluetooth, Wifi, AlertTriangle, CheckCircle2, X,
} from 'lucide-react';
import {
  listPrinters, createPrinter, updatePrinter, deletePrinter, setDefaultPrinter,
  listPrinterMappings, setPrinterTemplateMapping,
} from '@/services/print/printerService';
import { testPrinter } from '@/services/print/testPrinter';
import { refreshStatus, refreshAllStatuses, startStatusPolling, stopStatusPolling } from '@/services/print/printerStatus';
import { detectAllPrinters, getBrowserSupport, type DiscoveredPrinter } from '@/services/print/detectDevices';
import { getAllTemplates } from '@/services/print/templateService';
import { useCanPerform } from '@/services/print/permissions';
import { useNotificationStore } from '@/store/notificationStore';
import PrinterStatusBadge from '@/components/print/PrinterStatusBadge';
import {
  PRINTER_CONNECTION_LABELS_AR,
  PRINTER_TYPE_LABELS_AR,
  PRINTER_DRIVER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  type Printer,
  type PrinterConnectionKind,
  type PrinterType,
  type PrinterDriver,
  type DocTypeKey,
  ALL_DOC_TYPES,
} from '@/types/invoicePrint';

type FormMode = 'list' | 'create' | 'edit' | 'mappings';

interface PrintersPageProps {
  /** وضع مُدمج داخل تبويب: يُلغي h1 وعنصر الحشو العلوي */
  embedded?: boolean;
}

interface PrinterFormInput {
  name: string;
  type: PrinterType;
  connection: PrinterConnectionKind;
  address?: string;
  port?: number;
  paperSize: Printer['paperSize'];
  driver: PrinterDriver;
}

export default function PrintersPage({ embedded = false }: PrintersPageProps = {}) {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const canManage = useCanPerform('manage_printers' as never);
  const support = getBrowserSupport();

  const [mode, setMode] = useState<FormMode>('list');
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [mappingsPrinter, setMappingsPrinter] = useState<Printer | null>(null);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ['printers'],
    queryFn: () => listPrinters(true),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: getAllTemplates,
  });

  const refreshAllMut = useMutation({
    mutationFn: refreshAllStatuses,
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      const changed = results.filter((r) => r.changed).length;
      addNotification({
        title: 'تحديث الحالات',
        message: `تم تحديث ${results.length} طابعة${changed > 0 ? ` (${changed} تغيّرت)` : ''}`,
        type: 'success',
      });
    },
    onError: (err) => {
      addNotification({ title: 'فشل التحديث', message: String(err), type: 'error' });
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => testPrinter(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      addNotification({
        title: res.success ? 'نجح الاختبار' : 'فشل الاختبار',
        message: res.success ? res.message : `${res.message}${res.error ? ` — ${res.error}` : ''}`,
        type: res.success ? 'success' : 'error',
      });
      void id;
    },
  });

  const setStatusMut = useMutation({
    mutationFn: (id: string) => refreshStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printers'] }),
  });

  const createMut = useMutation({
    mutationFn: (input: PrinterFormInput) => createPrinter(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      addNotification({ title: 'تمت الإضافة', message: 'تمت إضافة الطابعة', type: 'success' });
      setMode('list');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PrinterFormInput> }) =>
      updatePrinter(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      addNotification({ title: 'تم التحديث', message: 'تم تحديث الطابعة', type: 'success' });
      setMode('list');
      setEditingPrinter(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePrinter(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      addNotification({
        title: res.softDeleted ? 'تم إلغاء التفعيل' : 'تم الحذف',
        message: res.softDeleted ? 'للطابعة تعيينات/سجل، تم إلغاء تفعيلها فقط' : 'تم حذف الطابعة',
        type: 'success',
      });
    },
    onError: (err) => addNotification({ title: 'فشل الحذف', message: String(err), type: 'error' }),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id: string) => setDefaultPrinter(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printers'] }),
  });

  const detectMut = useMutation({
    mutationFn: async () => {
      setDiscoverLoading(true);
      try {
        return await detectAllPrinters();
      } finally {
        setDiscoverLoading(false);
      }
    },
    onSuccess: (res) => {
      if (res.devices.length === 0) {
        const msg = [
          ...res.warnings,
          ...res.errors,
        ].join(' · ') || 'لم يتم العثور على طابعات';
        addNotification({ title: 'الكشف', message: msg, type: 'info' });
        return;
      }
      // إضافة أول جهاز مكتشف تلقائياً
      const dev = res.devices[0];
      createMut.mutate({
        name: dev.name,
        type: dev.type,
        connection: dev.connection,
        address: dev.address,
        port: dev.port,
        paperSize: '80mm',
        driver: 'esc_pos',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (mode === 'create' || (mode === 'edit' && editingPrinter)) {
    return (
      <PrinterForm
        initial={mode === 'edit' ? editingPrinter : null}
        onCancel={() => { setMode('list'); setEditingPrinter(null); }}
        onSave={(input) => {
          if (mode === 'edit' && editingPrinter) {
            updateMut.mutate({ id: editingPrinter.id, input });
          } else {
            createMut.mutate(input);
          }
        }}
        saving={createMut.isPending || updateMut.isPending}
      />
    );
  }

  if (mode === 'mappings' && mappingsPrinter) {
    return (
      <PrinterMappings
        printer={mappingsPrinter}
        templates={templates}
        onClose={() => { setMode('list'); setMappingsPrinter(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — يُلغى عن h1 والوصف في الوضع المُدمج، تبقى الأزرار */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {!embedded && (
            <>
              <h1 className="font-headline-xl text-headline-xl text-on-surface flex items-center gap-2">
                <PrinterIcon className="w-7 h-7 text-primary" />
                إدارة الطابعات
              </h1>
              <p className="text-on-surface-variant mt-1 text-sm">
                POS-PRINT-001 · FR-013 → FR-017 · {printers.length} طابعة
              </p>
            </>
          )}
          {embedded && (
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <PrinterIcon className="w-5 h-5 text-primary" />
              الطابعات · {printers.length}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => refreshAllMut.mutate()}
            disabled={refreshAllMut.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshAllMut.isPending ? 'animate-spin' : ''}`} />
            تحديث الحالات
          </button>
          <button
            onClick={() => detectMut.mutate()}
            disabled={!canManage || discoverLoading || (!support.usb && !support.bluetooth)}
            title={!support.usb && !support.bluetooth ? 'WebUSB/Bluetooth غير مدعوم في هذا المتصفح' : ''}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container transition-all disabled:opacity-50"
          >
            {discoverLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
            اكتشاف الأجهزة
          </button>
          {canManage && (
            <button
              onClick={() => setMode('create')}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              طابعة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Browser support banners */}
      <div className="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap">
        <span className="flex items-center gap-1">
          <Wifi className="w-3.5 h-3.5" /> شبكة: {support.browser ? 'متصفح' : '—'}
        </span>
        <span className="flex items-center gap-1">
          <Usb className={`w-3.5 h-3.5 ${support.usb ? 'text-emerald-600' : 'text-amber-600'}`} />
          USB: {support.usb ? 'مدعوم' : 'غير مدعوم'}
        </span>
        <span className="flex items-center gap-1">
          <Bluetooth className={`w-3.5 h-3.5 ${support.bluetooth ? 'text-emerald-600' : 'text-amber-600'}`} />
          Bluetooth: {support.bluetooth ? 'مدعوم' : 'غير مدعوم'}
        </span>
      </div>

      {/* Printers list */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-container/50">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface-variant">الاسم</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface-variant">النوع</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface-variant">الاتصال</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface-variant">الحالة</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface-variant">الحجم</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-on-surface-variant">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {printers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-on-surface-variant">
                  لا توجد طابعات بعد. اضغط "طابعة جديدة".
                </td>
              </tr>
            )}
            {printers.map((p) => (
              <tr key={p.id} className={`border-t border-outline-variant/20 ${!p.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.isDefault && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    <span className="font-medium text-on-surface">{p.name}</span>
                  </div>
                  {p.vendor && <span className="text-xs text-on-surface-variant">{p.vendor}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">
                  {PRINTER_TYPE_LABELS_AR[p.type]}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    {p.connection === 'usb' && <Usb className="w-3.5 h-3.5" />}
                    {p.connection === 'bluetooth' && <Bluetooth className="w-3.5 h-3.5" />}
                    {p.connection === 'network' && <Wifi className="w-3.5 h-3.5" />}
                    {PRINTER_CONNECTION_LABELS_AR[p.connection]}
                    {p.address && <span className="text-xs text-on-surface-variant">({p.address}{p.port ? `:${p.port}` : ''})</span>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PrinterStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{p.paperSize}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => testMut.mutate(p.id)}
                      disabled={testMut.isPending}
                      title="اختبار"
                      className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary"
                    >
                      {testMut.isPending && testMut.variables === p.id
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setStatusMut.mutate(p.id)}
                      disabled={setStatusMut.isPending}
                      title="تحديث الحالة"
                      className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary"
                    >
                      <RefreshCw className={`w-4 h-4 ${setStatusMut.isPending ? 'animate-spin' : ''}`} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => { setEditingPrinter(p); setMode('edit'); }}
                          title="تعديل"
                          className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setMappingsPrinter(p); setMode('mappings'); }}
                          title="تعيينات القوالب"
                          className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary"
                        >
                          <PrinterIcon className="w-4 h-4" />
                        </button>
                        {!p.isDefault && p.isActive && (
                          <>
                            <button
                              onClick={() => setDefaultMut.mutate(p.id)}
                              title="تعيين كافتراضية"
                              className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-amber-500"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            {p.id !== 'browser-printer' && (
                              <button
                                onClick={() => deleteMut.mutate(p.id)}
                                title="حذف"
                                className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ====== نماذج فرعية ======

function PrinterForm({
  initial, onCancel, onSave, saving,
}: {
  initial: Printer | null;
  onCancel: () => void;
  onSave: (input: PrinterFormInput) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<PrinterType>(initial?.type ?? 'thermal');
  const [connection, setConnection] = useState<PrinterConnectionKind>(initial?.connection ?? 'browser');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [port, setPort] = useState<number | ''>(initial?.port ?? 9100);
  const [paperSize, setPaperSize] = useState<Printer['paperSize']>(initial?.paperSize ?? '80mm');
  const [driver, setDriver] = useState<PrinterDriver>(initial?.driver ?? 'browser');

  const isSystem = initial?.id === 'browser-printer';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-xl text-headline-xl text-on-surface">
          {initial ? 'تعديل طابعة' : 'إضافة طابعة'}
        </h2>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-surface-container">
          <X className="w-5 h-5" />
        </button>
      </div>

      {isSystem && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            طابعة النظام الافتراضية لا يمكن تعديل اسمها أو نوعها أو طريقة اتصالها. باقي الحقول متاحة.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="الاسم">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSystem}
            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            placeholder="مثال: طابعة الكاشير USB"
          />
        </Field>
        <Field label="النوع">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PrinterType)}
            disabled={isSystem}
            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {Object.entries(PRINTER_TYPE_LABELS_AR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="طريقة الاتصال">
          <select
            value={connection}
            onChange={(e) => setConnection(e.target.value as PrinterConnectionKind)}
            disabled={isSystem}
            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {Object.entries(PRINTER_CONNECTION_LABELS_AR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="التعريف (Driver)">
          <select
            value={driver}
            onChange={(e) => setDriver(e.target.value as PrinterDriver)}
            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {Object.entries(PRINTER_DRIVER_LABELS_AR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        {connection === 'network' && (
          <>
            <Field label="العنوان (IP / Host)">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                placeholder="192.168.1.50"
              />
            </Field>
            <Field label="المنفذ">
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value) || '')}
                className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                placeholder="9100"
              />
            </Field>
          </>
        )}
        <Field label="حجم الورق">
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value as Printer['paperSize'])}
            className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="58mm">حراري 58mm</option>
            <option value="76mm">حراري 76mm</option>
            <option value="80mm">حراري 80mm</option>
            <option value="A4">A4</option>
            <option value="A5">A5</option>
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => onSave({ name, type, connection, address: address || undefined, port: port || undefined, paperSize, driver })}
          disabled={saving || !name}
          className="px-6 py-2.5 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
        <button onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container">
          إلغاء
        </button>
      </div>
    </div>
  );
}

function PrinterMappings({
  printer, templates, onClose,
}: {
  printer: Printer;
  templates: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: mappings = [] } = useQuery({
    queryKey: ['printerMappings', printer.id],
    queryFn: () => listPrinterMappings(printer.id),
  });

  const mapMut = useMutation({
    mutationFn: ({ docType, templateId }: { docType: DocTypeKey; templateId: string | null }) =>
      setPrinterTemplateMapping(printer.id, docType, templateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printerMappings', printer.id] }),
  });

  const currentMap: Partial<Record<DocTypeKey, string>> = {};
  for (const m of mappings) currentMap[m.docType as DocTypeKey] = m.templateId;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-xl text-headline-xl text-on-surface">
          تعيينات «{printer.name}»
        </h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-on-surface-variant">
        FR-014: اختر قالباً مخصصاً لكل نوع وثيقة عند استخدام هذه الطابعة.
        اتركه فارغاً للرجوع لقالب النوع الافتراضي.
      </p>
      <div className="space-y-3">
        {ALL_DOC_TYPES.map((docType) => (
          <div key={docType} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container/50">
            <span className="flex-1 text-sm font-medium">{DOC_TYPE_LABELS_AR[docType]}</span>
            <select
              value={currentMap[docType] ?? ''}
              onChange={(e) => mapMut.mutate({ docType, templateId: e.target.value || null })}
              className="flex-1 px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">— افتراضي النوع —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-on-surface mb-1.5">{label}</label>
      {children}
    </div>
  );
}
