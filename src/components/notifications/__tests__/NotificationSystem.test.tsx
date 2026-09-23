import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { NotificationToastCard } from '../NotificationToastCard';
import { InteractiveToastContainer } from '../InteractiveToastContainer';
import { NotificationCenterModal } from '../NotificationCenterModal';
import NotificationDropdown from '../NotificationDropdown';

// محاكاة محرك الصوت لتفادي استدعاء AudioContext الفعلي في بيئة الاختبار
vi.mock('@/services/sound/notificationSound', () => ({
  playNotificationChime: vi.fn(),
  unlockNotificationAudio: vi.fn(),
}));

describe('Interactive Notification System (نظام الإشعارات التفاعلي)', () => {
  beforeEach(() => {
    // تصفية المتجر و localStorage قبل كل اختبار
    localStorage.clear();
    useNotificationStore.setState({
      notifications: [],
      activeToasts: [],
      isCenterOpen: false,
      soundEnabled: true,
    });
    vi.clearAllMocks();
  });

  describe('1. useNotificationStore state & actions', () => {
    it('يضيف إشعاراً جديداً إلى notifications و activeToasts مع حساب عدد غير المقروءة', () => {
      const { addNotification } = useNotificationStore.getState();

      act(() => {
        addNotification({
          title: 'نفاد مخزون',
          message: 'المنتج قارورة 1.5 لتر شارف على الانتهاء',
          type: 'warning',
        });
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.activeToasts).toHaveLength(1);
      expect(state.notifications[0].title).toBe('نفاد مخزون');
      expect(state.notifications[0].read).toBe(false);
      expect(state.getUnreadCount()).toBe(1);
    });

    it('يغلق التوست المنبثق عبر dismissToast مع الإبقاء عليه في سجل الإشعارات العام', () => {
      const { addNotification, dismissToast } = useNotificationStore.getState();

      act(() => {
        addNotification({
          title: 'فاتورة جديدة',
          message: 'تم حفظ الفاتورة #1002 بنجاح',
          type: 'success',
        });
      });

      const notifId = useNotificationStore.getState().activeToasts[0].id;
      expect(useNotificationStore.getState().activeToasts).toHaveLength(1);

      act(() => {
        dismissToast(notifId);
      });

      expect(useNotificationStore.getState().activeToasts).toHaveLength(0);
      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });

    it('يحدد الإشعار كمقروء عبر markAsRead و markAllAsRead', () => {
      const { addNotification, markAsRead, markAllAsRead } = useNotificationStore.getState();

      act(() => {
        addNotification({ title: '1', message: 'م1', type: 'info' });
        addNotification({ title: '2', message: 'م2', type: 'info' });
      });

      expect(useNotificationStore.getState().getUnreadCount()).toBe(2);

      const firstId = useNotificationStore.getState().notifications[0].id;
      act(() => {
        markAsRead(firstId);
      });

      expect(useNotificationStore.getState().getUnreadCount()).toBe(1);

      act(() => {
        markAllAsRead();
      });

      expect(useNotificationStore.getState().getUnreadCount()).toBe(0);
    });

    it('يدعم كتم وتفعيل الصوت وحفظ الحالة في localStorage', () => {
      const { toggleSound } = useNotificationStore.getState();
      expect(useNotificationStore.getState().soundEnabled).toBe(true);

      act(() => {
        toggleSound();
      });

      expect(useNotificationStore.getState().soundEnabled).toBe(false);
      expect(localStorage.getItem('anpos_notification_sound')).toBe('false');

      act(() => {
        toggleSound();
      });

      expect(useNotificationStore.getState().soundEnabled).toBe(true);
      expect(localStorage.getItem('anpos_notification_sound')).toBe('true');
    });

    it('يدير حالة فتح وإغلاق مركز الإشعارات برمجياً', () => {
      const { openCenter, closeCenter, toggleCenter } = useNotificationStore.getState();
      expect(useNotificationStore.getState().isCenterOpen).toBe(false);

      act(() => {
        openCenter();
      });
      expect(useNotificationStore.getState().isCenterOpen).toBe(true);

      act(() => {
        closeCenter();
      });
      expect(useNotificationStore.getState().isCenterOpen).toBe(false);

      act(() => {
        toggleCenter();
      });
      expect(useNotificationStore.getState().isCenterOpen).toBe(true);
    });
  });

  describe('2. NotificationToastCard (بطاقة المودل التفاعلي في أسفل الشاشة)', () => {
    it('يعرض تفاصيل التنبيه وشارة الحالة وزر الإغلاق بنجاح', () => {
      const onDismiss = vi.fn();
      const notification = {
        id: 'toast-1',
        title: 'طابعة الإيصالات متصلة',
        message: 'تم التعرف على طابعة Xprinter بنجاح',
        type: 'success' as const,
        read: false,
        createdAt: new Date().toISOString(),
      };

      render(
        <MemoryRouter>
          <NotificationToastCard notification={notification} onDismiss={onDismiss} />
        </MemoryRouter>
      );

      expect(screen.getByText('طابعة الإيصالات متصلة')).toBeDefined();
      expect(screen.getByText('تم التعرف على طابعة Xprinter بنجاح')).toBeDefined();
      expect(screen.getByText('نجاح')).toBeDefined();

      const closeBtn = screen.getByTitle('إغلاق التنبيه');
      fireEvent.click(closeBtn);
      expect(onDismiss).toHaveBeenCalledWith('toast-1');
    });

    it('ينفذ زر الإجراء التفاعلي (action button) عند النقر عليه ويغلق التوست', () => {
      const onDismiss = vi.fn();
      const onActionClick = vi.fn();

      const notification = {
        id: 'toast-action',
        title: 'مخزون منخفض',
        message: 'منتج سكر 1 كغ تحت حد الأمان',
        type: 'warning' as const,
        read: false,
        createdAt: new Date().toISOString(),
        action: {
          label: 'انتقال للمخزون',
          onClick: onActionClick,
          link: '/inventory',
        },
      };

      render(
        <MemoryRouter>
          <NotificationToastCard notification={notification} onDismiss={onDismiss} />
        </MemoryRouter>
      );

      const actionBtn = screen.getByText('انتقال للمخزون');
      expect(actionBtn).toBeDefined();

      fireEvent.click(actionBtn);
      expect(onActionClick).toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalledWith('toast-action');
    });

    it('يعرض بطاقة تنبيه مخصصة للديون بشارة دين / بيع آجل أو تسديد دين', () => {
      const onDismiss = vi.fn();
      const debtNotification = {
        id: 'toast-debt-1',
        title: 'تم تسجيل بيع بالآجل (دين على الزبون)',
        message: 'فاتورة #INV-900: قيد 5,000 دج كدين على أحمد بن علي',
        type: 'warning' as const,
        category: 'debt',
        debtMetadata: {
          customerId: 'cust-1',
          customerName: 'أحمد بن علي',
          debtAmount: 5000,
          actionType: 'credit_sale' as const,
        },
        read: false,
        createdAt: new Date().toISOString(),
      };

      const { rerender } = render(
        <MemoryRouter>
          <NotificationToastCard notification={debtNotification} onDismiss={onDismiss} />
        </MemoryRouter>
      );

      expect(screen.getByText('دين / بيع آجل')).toBeDefined();
      expect(screen.getByText('تم تسجيل بيع بالآجل (دين على الزبون)')).toBeDefined();

      // تجربة تسديد دين
      const settlementNotification = {
        ...debtNotification,
        id: 'toast-debt-2',
        debtMetadata: {
          ...debtNotification.debtMetadata,
          actionType: 'debt_settlement' as const,
        },
      };

      rerender(
        <MemoryRouter>
          <NotificationToastCard notification={settlementNotification} onDismiss={onDismiss} />
        </MemoryRouter>
      );

      expect(screen.getByText('تسديد دين')).toBeDefined();
    });
  });

  describe('3. InteractiveToastContainer (حاوية التكديس في أسفل اليسار)', () => {
    it('يعرض التوستات النشطة في الركن السفلي الأيسر مع شريط الإشعارات الإضافية عند تكديس أكثر من 3', () => {
      act(() => {
        for (let i = 1; i <= 5; i++) {
          useNotificationStore.getState().addNotification({
            title: `إشعار #${i}`,
            message: `تفاصيل الإشعار #${i}`,
            type: 'info',
          });
        }
      });

      render(
        <MemoryRouter>
          <InteractiveToastContainer />
        </MemoryRouter>
      );

      // أول 3 فقط تظهر كبطاقات
      expect(screen.getByText('إشعار #5')).toBeDefined();
      expect(screen.getByText('إشعار #4')).toBeDefined();
      expect(screen.getByText('إشعار #3')).toBeDefined();

      // شريط الإشعارات الإضافية يظهر لـ +2 إشعارات أخرى
      expect(screen.getByText('+2 إشعارات أخرى في المركز')).toBeDefined();

      // النقر على شريط الإشعارات الإضافية يفتح مركز الإشعارات
      fireEvent.click(screen.getByText('+2 إشعارات أخرى في المركز'));
      expect(useNotificationStore.getState().isCenterOpen).toBe(true);
    });
  });

  describe('4. NotificationCenterModal (مركز الإشعارات التفاعلي الشامل)', () => {
    it('يعرض مركز الإشعارات عند فتحه مع التبويبات وقائمة الإشعارات', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          title: 'تحذير أمني',
          message: 'محاولة تسجيل دخول فاشلة',
          type: 'error',
        });
        useNotificationStore.getState().addNotification({
          title: 'تم التفعيل بنجاح',
          message: 'ترخيص البرنامج نشط',
          type: 'success',
        });
        useNotificationStore.getState().addNotification({
          title: 'بيع بالآجل للزبون',
          message: 'قيد مبلغ 5000 دج كدين',
          type: 'warning',
          category: 'debt',
        });
        useNotificationStore.getState().openCenter();
      });

      render(
        <MemoryRouter>
          <NotificationCenterModal />
        </MemoryRouter>
      );

      expect(screen.getByText('مركز الإشعارات والتنبيهات')).toBeDefined();
      expect(screen.getByText('تحذير أمني')).toBeDefined();
      expect(screen.getByText('تم التفعيل بنجاح')).toBeDefined();
      expect(screen.getByText('بيع بالآجل للزبون')).toBeDefined();

      // التبديل لتبويب الديون
      fireEvent.click(screen.getByText(/الديون/));
      expect(screen.getByText('بيع بالآجل للزبون')).toBeDefined();
      expect(screen.queryByText('تحذير أمني')).toBeNull();
      expect(screen.queryByText('تم التفعيل بنجاح')).toBeNull();

      // التبديل لتبويب تنبيهات وأخطاء
      fireEvent.click(screen.getByText('تنبيهات وأخطاء'));
      expect(screen.getByText('تحذير أمني')).toBeDefined();
      expect(screen.queryByText('تم التفعيل بنجاح')).toBeNull();
      expect(screen.queryByText('بيع بالآجل للزبون')).toBeNull();

      // التبديل لتبويب نجاح ومعلومات
      fireEvent.click(screen.getByText('نجاح ومعلومات'));
      expect(screen.queryByText('تحذير أمني')).toBeNull();
      expect(screen.getByText('تم التفعيل بنجاح')).toBeDefined();
      expect(screen.queryByText('بيع بالآجل للزبون')).toBeNull();
    });

    it('يسمح بتحديد الكل كمقروء ومسح السجل بالكامل من المركز', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          title: 'إشعار تجريبي',
          message: 'نص تجريبي',
          type: 'info',
        });
        useNotificationStore.getState().openCenter();
      });

      render(
        <MemoryRouter>
          <NotificationCenterModal />
        </MemoryRouter>
      );

      expect(useNotificationStore.getState().getUnreadCount()).toBe(1);

      // تحديد الكل كمقروء
      const markAllBtn = screen.getByTitle('تحديد الكل كمقروء');
      fireEvent.click(markAllBtn);
      expect(useNotificationStore.getState().getUnreadCount()).toBe(0);

      // مسح السجل
      const clearBtn = screen.getByTitle('مسح سجل الإشعارات');
      fireEvent.click(clearBtn);
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
      expect(screen.getByText('لا توجد إشعارات في هذا التبويب')).toBeDefined();
    });
  });

  describe('5. NotificationDropdown (تكامل زر الإشعارات والقائمة المنسدلة بجانب الزر)', () => {
    it('يعرض شارة غير المقروءة ويفتح القائمة المنسدلة بجانب الزر عند النقر عليه', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          title: 'إشعار غير مقروء في القائمة',
          message: 'تفاصيل إشعار القائمة المنسدلة',
          type: 'info',
        });
      });

      render(
        <MemoryRouter>
          <NotificationDropdown>
            <button data-testid="bell-btn">جرس</button>
          </NotificationDropdown>
        </MemoryRouter>
      );

      // شارة غير المقروءة ظاهرة
      expect(screen.getByText('1')).toBeDefined();

      // القائمة مغلقة مبدئياً
      expect(screen.queryByRole('menu')).toBeNull();

      // النقر على زر الجرس يفتح القائمة المنسدلة بجانب الزر
      const bellBtn = screen.getByTestId('bell-btn');
      fireEvent.click(bellBtn);

      expect(screen.getByRole('menu')).toBeDefined();
      expect(screen.getByText('إشعار غير مقروء في القائمة')).toBeDefined();
      expect(screen.getByText('1 غير مقروءة')).toBeDefined();

      // النقر مرة أخرى يغلق القائمة المنسدلة
      fireEvent.click(bellBtn);
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('يسمح بتبديل تبويبات القائمة المنسدلة وتحديد الكل كمقروء ومسح السجل', () => {
      act(() => {
        useNotificationStore.getState().addNotification({
          title: 'تحذير مخزون',
          message: 'نقص حاد في المخزون',
          type: 'warning',
        });
        useNotificationStore.getState().addNotification({
          title: 'عملية ناجحة',
          message: 'تم حفظ الفاتورة بنجاح',
          type: 'success',
        });
        useNotificationStore.getState().addNotification({
          title: 'دين زبون في القائمة',
          message: 'تسجيل دين آجل',
          type: 'warning',
          category: 'debt',
        });
      });

      render(
        <MemoryRouter>
          <NotificationDropdown>
            <button data-testid="bell-btn">جرس</button>
          </NotificationDropdown>
        </MemoryRouter>
      );

      // فتح القائمة
      fireEvent.click(screen.getByTestId('bell-btn'));
      expect(screen.getByText('تحذير مخزون')).toBeDefined();
      expect(screen.getByText('عملية ناجحة')).toBeDefined();
      expect(screen.getByText('دين زبون في القائمة')).toBeDefined();

      // التبديل لتبويب الديون
      fireEvent.click(screen.getByText(/الديون/));
      expect(screen.getByText('دين زبون في القائمة')).toBeDefined();
      expect(screen.queryByText('تحذير مخزون')).toBeNull();
      expect(screen.queryByText('عملية ناجحة')).toBeNull();

      // التبديل لتبويب تنبيهات
      fireEvent.click(screen.getByText('تنبيهات'));
      expect(screen.getByText('تحذير مخزون')).toBeDefined();
      expect(screen.queryByText('عملية ناجحة')).toBeNull();
      expect(screen.queryByText('دين زبون في القائمة')).toBeNull();

      // التبديل لتبويب نجاح
      fireEvent.click(screen.getByText('نجاح'));
      expect(screen.queryByText('تحذير مخزون')).toBeNull();
      expect(screen.getByText('عملية ناجحة')).toBeDefined();
      expect(screen.queryByText('دين زبون في القائمة')).toBeNull();

      // تحديد الكل كمقروء
      const markAllBtn = screen.getByTitle('تحديد الكل كمقروء');
      fireEvent.click(markAllBtn);
      expect(useNotificationStore.getState().getUnreadCount()).toBe(0);

      // مسح السجل
      const clearBtn = screen.getByTitle('مسح السجل');
      fireEvent.click(clearBtn);
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
      expect(screen.getByText('لا توجد إشعارات حالياً')).toBeDefined();
    });
  });
});
