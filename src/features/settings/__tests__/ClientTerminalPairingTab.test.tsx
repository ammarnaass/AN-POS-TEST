import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientTerminalPairingTab from '../tabs/ClientTerminalPairingTab';

// Mock system settings
const mockHandleSaveSettings = vi.fn();
let mockSettings: Record<string, any> = {
  serverLanUrl: '',
  terminalCode: 'T02',
  clientToken: '',
  clientDeviceId: '',
  connectionKey: '849201',
  shopName: 'AN POS Market',
};

vi.mock('../hooks/useSystemSettings', () => ({
  useSystemSettings: () => ({
    settings: mockSettings,
    handleSaveSettings: mockHandleSaveSettings,
  }),
}));

vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: () => ({
    addNotification: vi.fn(),
  }),
}));

vi.mock('@/lib/realtimeEventBus', () => ({
  realtimeEventBus: {
    getStatus: () => ({ state: 'idle', transport: 'WebSocket (ws://)', lastPingMs: 6 }),
    onStatusChange: vi.fn(() => () => {}),
  },
}));

vi.mock('@/lib/transportGateway', () => ({
  getStoredTransportConfig: vi.fn(() => ({})),
  setStoredTransportConfig: vi.fn(),
  getStoredServerLanUrl: vi.fn(() => ''),
  getStoredClientToken: vi.fn(() => ''),
  getStoredClientDeviceId: vi.fn(() => ''),
}));

vi.mock('../components/PairingQR', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="pairing-qr">{title}</div>,
}));

vi.mock('@/features/barcode/components/BarcodeSvg', () => ({
  BarcodeSvg: ({ value }: { value: string }) => <div data-testid="barcode-svg">{value}</div>,
}));

vi.mock('@/features/network/components/NetworkSetupWizard', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="network-wizard-modal">
        <span>معالج الإعداد التفاعلي</span>
        <button onClick={onClose}>إغلاق</button>
      </div>
    ) : null,
}));

describe('ClientTerminalPairingTab — اختبارات الواجهة والمعمارية المفككة', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      serverLanUrl: '',
      terminalCode: 'T02',
      clientToken: '',
      clientDeviceId: '',
      connectionKey: '849201',
      shopName: 'AN POS Market',
    };
  });

  it('يعرض ترويسة نقطة البيع الفرعية وحالة بانتظار الاقتران عند عدم توفر توكن', () => {
    render(<ClientTerminalPairingTab />);

    expect(screen.getByText('ربط نقطة البيع الفرعية (Client Terminal POS)')).toBeDefined();
    expect(screen.getByText('بانتظار الاقتران')).toBeDefined();
    expect(screen.getByText('معالج الإعداد التفاعلي')).toBeDefined();
  });

  it('يفتح معالج الإعداد التفاعلي عند النقر على زره في الترويسة', () => {
    render(<ClientTerminalPairingTab />);

    const wizardBtn = screen.getByText('معالج الإعداد التفاعلي');
    fireEvent.click(wizardBtn);

    expect(screen.getByTestId('network-wizard-modal')).toBeDefined();
  });

  it('يبدل بين قسم الاقتران وقسم معلومات الخادم الرئيسي بسلاسة', () => {
    render(<ClientTerminalPairingTab />);

    // الافتراضي هو قسم الاقتران
    expect(screen.getByText('إعداد واقتران محطة الكاشير')).toBeDefined();

    // التبديل إلى قسم معلومات الخادم
    const serverInfoTabBtn = screen.getByText('2. إعداد الخادم الرئيسي ومعلوماته');
    fireEvent.click(serverInfoTabBtn);

    expect(screen.getByText('معلومات وهوية الخادم الرئيسي (Master Server Details)')).toBeDefined();
    expect(screen.getByText('رمز الاقتران السري للخادم (Connection Key / PIN)')).toBeDefined();
    expect(screen.getByTestId('barcode-svg')).toBeDefined();
    expect(screen.getByTestId('pairing-qr')).toBeDefined();

    // العودة لقسم اقتران الكاشير
    const pairingTabBtn = screen.getByText('1. اقتران نقطة البيع الفرعية');
    fireEvent.click(pairingTabBtn);

    expect(screen.getByText('إعداد واقتران محطة الكاشير')).toBeDefined();
  });

  it('يسمح بالتبديل بين البحث التلقائي والإدخال اليدوي داخل نموذج الاقتران', () => {
    render(<ClientTerminalPairingTab />);

    // الوضع الافتراضي بحث تلقائي
    expect(screen.getByText('كشف خوادم الشبكة المحلية (mDNS / UDP)')).toBeDefined();
    expect(screen.getByText('مسح الشبكة الآن')).toBeDefined();

    // التبديل إلى إدخال يدوي
    const manualBtn = screen.getByText('إدخال يدوي');
    fireEvent.click(manualBtn);

    // يختفي قسم المسح التلقائي
    expect(screen.queryByText('كشف خوادم الشبكة المحلية (mDNS / UDP)')).toBeNull();
    // تظل حقول الإدخال والـ PIN موجودة
    expect(screen.getByPlaceholderText('http://192.168.1.50:3000')).toBeDefined();
  });

  it('يعرض بطاقة الجلسة المعتمدة وزر فك الارتباط عند اقتران المحطة بالخادم', () => {
    mockSettings = {
      serverLanUrl: 'http://192.168.1.100:3000',
      terminalCode: 'T02',
      clientToken: 'jwt-valid-sample-token',
      clientDeviceId: 'DEV-POS-1234',
      connectionKey: '849201',
    };

    render(<ClientTerminalPairingTab />);

    expect(screen.getByText('مقترن ومعتمد')).toBeDefined();
    expect(screen.getByText('جلسة الكاشير الموثقة والمعتمدة')).toBeDefined();
    expect(screen.getByText('إلغاء الاقتران')).toBeDefined();
    expect(screen.getByText('http://192.168.1.100:3000')).toBeDefined();
    expect(screen.getByText('DEV-POS-1234')).toBeDefined();
  });

  it('يعرض بطاقة صمود العمليات في وضع أوفلاين ومسار الخطوات الإرشادي عند انتظار الاقتران', () => {
    render(<ClientTerminalPairingTab />);

    // بطاقة صمود العمليات في وضع أوفلاين
    expect(screen.getByText('صمود العمليات في وضع أوفلاين (Offline Resilience Mode)')).toBeDefined();
    expect(screen.getByText('قاعدة بيانات محلية آمنة')).toBeDefined();
    expect(screen.getByText('طباعة الإيصالات فورياً')).toBeDefined();
    expect(screen.getByText('مزامنة تلقائية صامتة')).toBeDefined();

    // مسار الخطوات الثلاث
    expect(screen.getByText('1. تحديد السيرفر')).toBeDefined();
    expect(screen.getByText('2. فحص الاستجابة')).toBeDefined();
    expect(screen.getByText('3. رمز PIN والاقتران')).toBeDefined();
  });
});

