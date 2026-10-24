import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppTitleBar } from '../AppTitleBar';

describe('AppTitleBar (شريط عنوان نافذة التطبيق المدمج)', () => {
  let queryClient: QueryClient;

  const mockWindowControls = {
    minimize: vi.fn().mockResolvedValue(true),
    maximize: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(true),
    isMaximized: vi.fn().mockResolvedValue(false),
    onMaximizedChange: vi.fn().mockReturnValue(() => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // محاكاة واجهة ElectronAPI في بيئة الاختبار
    (window as any).electronAPI = {
      windowControls: mockWindowControls,
    };
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  const renderTitleBar = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AppTitleBar />
      </QueryClientProvider>
    );
  };

  it('يعرض شريط النافذة مع الأيقونة الرسمية واسم البرنامج AN POS ورقم الإصدار', async () => {
    renderTitleBar();

    expect(screen.getByTestId('app-title-bar')).toBeInTheDocument();
    expect(screen.getAllByText('AN POS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('v3.0.0')).toBeInTheDocument();

    const logo = screen.getByAltText('AN POS Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/an-pos-icon.png');
  });

  it('يستدعي windowControls.minimize عند الضغط على زر التصغير', async () => {
    renderTitleBar();

    const minBtn = screen.getByLabelText('تصغير النافذة');
    expect(minBtn).toBeInTheDocument();

    fireEvent.click(minBtn);
    expect(mockWindowControls.minimize).toHaveBeenCalledTimes(1);
  });

  it('يستدعي windowControls.maximize عند الضغط على زر التكبير أو النقر المزدوج على الشريط', async () => {
    renderTitleBar();

    const maxBtn = screen.getByLabelText('تكبير النافذة');
    expect(maxBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(maxBtn);
    });
    expect(mockWindowControls.maximize).toHaveBeenCalledTimes(1);

    // فحص النقر المزدوج على شريط العنوان
    const titleBar = screen.getByTestId('app-title-bar');
    await act(async () => {
      fireEvent.doubleClick(titleBar);
    });
    expect(mockWindowControls.maximize).toHaveBeenCalledTimes(2);
  });

  it('يستدعي windowControls.close عند الضغط على زر الإغلاق', async () => {
    renderTitleBar();

    const closeBtn = screen.getByLabelText('إغلاق البرنامج');
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(mockWindowControls.close).toHaveBeenCalledTimes(1);
  });

  it('يغير أيقونة التكبير إلى استعادة عند إشعار النافذة بالتكبير', async () => {
    let notifyCallback: ((isMax: boolean) => void) | undefined;
    mockWindowControls.onMaximizedChange.mockImplementation((cb) => {
      notifyCallback = cb;
      return () => {};
    });

    renderTitleBar();

    // التأكد من استدعاء فحص التكبير الأولي
    await waitFor(() => {
      expect(mockWindowControls.isMaximized).toHaveBeenCalled();
    });

    // في البداية: الحالة غير مكبرة
    expect(screen.getByLabelText('تكبير النافذة')).toBeInTheDocument();

    // إطلاق إشعار التكبير من Electron Main
    act(() => {
      notifyCallback?.(true);
    });
    await waitFor(() => {
      expect(screen.getByLabelText('استعادة الحجم')).toBeInTheDocument();
    });
  });

  it('لا يعرض أزرار سطح المكتب في بيئة المتصفح العادي بدون Electron', () => {
    delete (window as any).electronAPI;

    const { container } = renderTitleBar();
    expect(container.querySelector('#app-title-bar')).not.toBeInTheDocument();
  });
});
