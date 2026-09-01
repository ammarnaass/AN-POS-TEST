// مكوّن عرض رمز QR لاقتران الهاتف بسطح المكتب.
// يستخدم مكتبة qrcode لتوليد SVG متجاوب وأنيق.
// البيانات المشفّرة في QR: { ip, port, key, shopName }

import { useEffect, useState } from 'react';
import { Copy, Check, QrCode, RefreshCw } from 'lucide-react';

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

export default function PairingQR({
  data,
  title = 'امسح الرمز بهاتفك',
  subtitle = 'افتح تطبيق AN POS على هاتفك وامسح هذا الرمز للاتصال الفوري',
}: Props) {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

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
          width: 260,
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
    return () => {
      cancelled = true;
    };
  }, [data]);

  const copyToClipboard = (text: string, type: 'key' | 'url') => {
    navigator.clipboard?.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-on-surface-variant font-tajawal">جاري توليد رمز الاستجابة السريعة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 text-error rounded-2xl text-xs font-cairo text-center">
        خطأ في توليد رمز QR: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-on-surface-variant text-xs font-cairo">
        فعّل خادم الشبكة المحلية أولاً لعرض رمز QR
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-[320px] mx-auto text-center gap-3">
      {/* Title */}
      <div>
        <h3 className="text-base font-bold font-cairo text-on-surface flex items-center justify-center gap-1.5">
          <QrCode className="w-4 h-4 text-primary" />
          <span>{title}</span>
        </h3>
        <p className="text-xs text-on-surface-variant font-tajawal mt-0.5 leading-snug">{subtitle}</p>
      </div>

      {/* QR Code Container with High-Contrast Frame */}
      <div className="p-3 bg-white dark:bg-white rounded-2xl border border-outline-variant/30 shadow-md flex items-center justify-center w-full max-w-[260px] aspect-square">
        {qrSvg ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl">
            <span className="text-xs text-slate-500">QR غير متاح</span>
          </div>
        )}
      </div>

      {/* Quick Action Copy Badges */}
      <div className="w-full space-y-1.5 pt-1 text-xs" dir="ltr">
        {/* URL Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/15 font-mono text-[11px]">
          <span className="text-on-surface truncate">http://{data.ip}:{data.port}</span>
          <button
            type="button"
            onClick={() => copyToClipboard(`http://${data.ip}:${data.port}`, 'url')}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors ml-1 shrink-0 cursor-pointer"
            title="نسخ عنوان السيرفر"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Key Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/15 font-mono text-[11px]">
          <span className="text-on-surface truncate">Key: {data.key}</span>
          <button
            type="button"
            onClick={() => copyToClipboard(data.key, 'key')}
            className="p-1 text-on-surface-variant hover:text-primary transition-colors ml-1 shrink-0 cursor-pointer"
            title="نسخ مفتاح الأمان"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
