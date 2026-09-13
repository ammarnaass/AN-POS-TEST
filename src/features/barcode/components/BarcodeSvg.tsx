import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { generateQRSVG } from '@/services/barcode/generateQR';
import type { BarcodeFormat } from '../types';

interface BarcodeSvgProps {
  value: string;
  format: BarcodeFormat;
  height?: number;
  width?: number;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  format,
  height = 30,
  width = 1.2,
  className = '',
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setErr(null);

    if (!value || !value.trim()) {
      if (active) setErr('الباركود فارغ');
      return;
    }

    if (format === 'qr') {
      // Real QR Code via qrcode package SVG
      generateQRSVG(value, { size: Math.max(30, Math.min(height * 2.8, 140)) })
        .then((svgStr) => {
          if (!active || !qrContainerRef.current) return;
          qrContainerRef.current.innerHTML = svgStr;
        })
        .catch((e) => {
          if (active) setErr(e?.message ?? 'خطأ في توليد QR');
        });
    } else {
      // Linear 1D barcode via JsBarcode
      const fmtMap: Record<Exclude<BarcodeFormat, 'qr'>, string> = {
        ean13: 'EAN13',
        ean8: 'EAN8',
        code128: 'CODE128',
        code39: 'CODE39',
        upca: 'UPC',
      };
      const fmt = fmtMap[format as Exclude<BarcodeFormat, 'qr'>];
      if (!ref.current) return;
      try {
        JsBarcode(ref.current, value, {
          format: fmt,
          width,
          height,
          displayValue: false,
          margin: 1,
          fontSize: 9,
          valid: () => {},
        });
      } catch (e: any) {
        if (active) setErr(String(e?.message ?? 'تنسيق غير متوافق'));
      }
    }

    return () => {
      active = false;
    };
  }, [value, format, height, width]);

  if (err) {
    return (
      <div className="text-[9px] text-rose-500 font-mono text-center py-1 bg-rose-500/10 rounded px-1 max-w-full truncate">
        {err}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center max-w-full overflow-hidden ${className}`}>
      <svg ref={ref} className={format === 'qr' ? 'hidden' : 'max-w-full block'} />
      <div
        ref={qrContainerRef}
        className={format === 'qr' ? 'flex items-center justify-center' : 'hidden'}
      />
    </div>
  );
};
