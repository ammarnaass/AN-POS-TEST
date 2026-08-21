// مكوّن عرض رمز QR لاقتران الهاتف بسطح المكتب.
// يستخدم مكتبة qrcode (موجودة في deps) لتوليد SVG.
// البيانات المشفّرة في QR: { ip, port, key, shopName }
// الهاتف يمسحها ثم يُرسل POST /api/pair بهذه المعلومات.

import { useEffect, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let QRCodeGen: any = null;

async function loadQRCode() {
  if (!QRCodeGen) {
    QRCodeGen = (await import('qrcode')).default;
  }
  return QRCodeGen;
}

export interface PairingData {
  ip: string;
  port: number;
  key: string;
  shopName: string;
  ips: string[];
}

interface Props {
  data: PairingData | null;
  title?: string;
  subtitle?: string;
}

export default function PairingQR({ data, title = 'امسح الرمز بهاتفك', subtitle = 'افتح تطبيق AN POS على هاتفك وامسح هذا الرمز' }: Props) {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function renderQR() {
      if (!data || !data.key) {
        setLoading(false);
        return;
      }
      try {
        const QR = await loadQRCode();
        const payload = JSON.stringify({
          ip: data.ip,
          port: data.port,
          key: data.key,
          shop: data.shopName,
        });
        if (cancelled) return;
        const svg = await QR.toString(payload, {
          type: 'svg',
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 280,
          color: { dark: '#0b1220', light: '#ffffff' },
        });
        if (!cancelled) {
          setQrSvg(svg);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || 'فشل توليد QR');
          setLoading(false);
        }
      }
    }
    renderQR();
    return () => { cancelled = true; };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/10 text-error rounded-lg text-sm">
        خطأ في توليد QR: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-on-surface-variant text-sm">
        فعّل خادم الشبكة المحلية أولاً لعرض رمز QR
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-outline-variant/20 text-center">
      <div>
        <h3 className="text-headline-sm font-bold text-on-surface">{title}</h3>
        <p className="text-body-sm text-on-surface-variant mt-1">{subtitle}</p>
      </div>
      {qrSvg ? (
        <div
          className="w-[280px] h-[280px] bg-white p-2 rounded-lg"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      ) : (
        <div className="w-[280px] h-[280px] flex items-center justify-center bg-surface-container-low rounded-lg">
          <span className="text-xs text-on-surface-variant">QR غير متاح</span>
        </div>
      )}
      <div className="mt-2 text-xs space-y-1 text-on-surface-variant" dir="ltr">
        <div className="font-mono">IP: {data.ip}:{data.port}</div>
        {data.ips.length > 1 && (
          <div className="text-[10px] text-on-surface-variant/70">
            (عناوين إضافية: {data.ips.slice(1).join(', ')})
          </div>
        )}
        <div className="font-mono">Key: {data.key}</div>
      </div>
    </div>
  );
}
