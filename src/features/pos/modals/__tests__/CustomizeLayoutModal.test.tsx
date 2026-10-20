import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CustomizeLayoutModal } from '../CustomizeLayoutModal';

describe('CustomizeLayoutModal (تنظيم التبويبات الثلاثة)', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    posLayout: 'design7' as const,
    setPosLayout: vi.fn(),
    viewMode: 'grid' as const,
    setViewMode: vi.fn(),
    showProductImages: true,
    setShowProductImages: vi.fn(),
    uiZoom: 100,
    setUiZoom: vi.fn(),
    screenResolution: '1920x1080' as const,
    setScreenResolution: vi.fn(),
  };

  it('يعرض شريط التبويبات الثلاثة الرئيسية', () => {
    render(<CustomizeLayoutModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /دقة الشاشة/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تصاميم الكاشير/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /المظهر والتفضيلات/ })).toBeInTheDocument();
  });

  it('يعرض محتوى تبويب دقة الشاشة بشكل افتراضي مع التشخيص ومصفوفة الدقات', () => {
    render(<CustomizeLayoutModal {...defaultProps} />);

    expect(screen.getByText(/دقة الشاشة الفيزيائية:/)).toBeInTheDocument();
    expect(screen.getByText(/1920 × 1080 \(FHD\)/)).toBeInTheDocument();
    expect(screen.getByText(/مقياس التكبير اليدوي للواجهة/)).toBeInTheDocument();
  });

  it('ينتقل إلى تبويب تصاميم الكاشير عند الضغط عليه ويعرض التصاميم الستة', () => {
    render(<CustomizeLayoutModal {...defaultProps} />);

    const layoutsTabBtn = screen.getByRole('button', { name: /تصاميم الكاشير/ });
    fireEvent.click(layoutsTabBtn);

    expect(screen.getByText(/تصميم 1 \(العصري\)/)).toBeInTheDocument();
    expect(screen.getByText(/تصميم 2/)).toBeInTheDocument();
    expect(screen.getByText(/تصميم 3 \(الكلاسيكي المحسن\)/)).toBeInTheDocument();
    expect(screen.getByText(/تصميم 4 \(الحديث\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/تصميم 5 \(الكلاسيكي المتقدم\)/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/تصميم 6 \(محطة العمل الاحترافية\)/)).toBeInTheDocument();
    expect(screen.getByText(/شريط العبوات والمفضلة في تصميم 5/)).toBeInTheDocument();

    // اختيار تصميم 6 (المحطة الاحترافية)
    const workstationDesignBtn = screen.getByText(/تصميم 6 \(محطة العمل الاحترافية\)/);
    fireEvent.click(workstationDesignBtn);
    expect(defaultProps.setPosLayout).toHaveBeenCalledWith('workstation');
  });

  it('ينتقل إلى تبويب المظهر والتفضيلات ويعرض خيارات السمة ونمط العرض والصور', () => {
    render(<CustomizeLayoutModal {...defaultProps} />);

    const appearanceTabBtn = screen.getByRole('button', { name: /المظهر والتفضيلات/ });
    fireEvent.click(appearanceTabBtn);

    expect(screen.getAllByText(/الوضع النهاري/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/الوضع المظلم/)).toBeInTheDocument();
    expect(screen.getByText(/عرض شبكي \(Grid\)/)).toBeInTheDocument();
    expect(screen.getByText(/عرض قائمة \(List\)/)).toBeInTheDocument();
    expect(screen.getByText(/إظهار صور المنتجات/)).toBeInTheDocument();
  });

  it('يستدعي زر الإغلاق وزر "تم وحفظ" في التذييل الدالة onClose', () => {
    render(<CustomizeLayoutModal {...defaultProps} />);

    const saveBtn = screen.getByRole('button', { name: /تم وحفظ/ });
    fireEvent.click(saveBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
