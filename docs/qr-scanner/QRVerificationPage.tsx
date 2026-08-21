// QRVerificationPage — شاشة التحقق من فواتير QR Code ZATCA
// POS-SCAN-002: Safe POS QR Code Reader
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import {
  decodeZATCAQR,
  validateVATNumber,
  validateTimestamp,
  type ZATCAInvoiceData,
} from '@/services/barcode/tlvDecoder';
import {
  ScanLine, CheckCircle, XCircle, AlertTriangle, Clock,
  Search, Download, RefreshCw, Shield, FileText, X,
  Camera, Keyboard, Wifi, WifiOff,
} from 'lucide-react';

type VerificationStatus = 'idle' | 'scanning' | 'verifying' | 'valid' | 'invalid' | 'warning' | 'error';
type ScanMode = 'camera' | 'manual' | 'usb';

interface VerificationResult {
  status: VerificationStatus;
  data: ZATCAInvoiceData | null;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

const EMPTY_RESULT: VerificationResult = {
  status: 'idle',
  data: null,
  errors: [],
  warnings: [],
  timestamp: '',
};

export default function QRVerificationPage() {
  const queryClient = useQueryClient();
  const [scanMode, setScanMode] = useState<ScanMode>('manual');
  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState<VerificationResult>(EMPTY_RESULT);
  const [history, setHistory] = useState<VerificationResult[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // USB Barcode Scanner Support
  useEffect(() => {
    if (scanMode !== 'usb') return;

    const buffer: string[] = [];
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length === 1) {
        const now = Date.now();
        if (now - lastKeyTime > 100) {
          buffer.length = 0; // Reset if too slow
        }
        buffer.push(e.key);
        lastKeyTime = now;
      }

      if (e.key === 'Enter' && buffer.length > 0) {
        const code = buffer.join('');
        buffer.length = 0;
        handleVerify(code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanMode]);

  // Camera QR Scanner
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Capture and scan QR from camera
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Use browser BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      detector.detect(canvas).then((barcodes) => {
        if (barcodes.length > 0) {
          handleVerify(barcodes[0].rawValue);
          stopCamera();
        }
      });
    }
  }, [stopCamera]);

  // Auto-capture loop when camera is active
  useEffect(() => {
    if (!cameraActive || scanMode !== 'camera') return;
    const interval = setInterval(captureFrame, 500);
    return () => clearInterval(interval);
  }, [cameraActive, scanMode, captureFrame]);

  // Main verification handler
  const handleVerify = useCallback((qrData: string) => {
    if (!qrData.trim()) return;

    setResult({ ...EMPTY_RESULT, status: 'verifying', timestamp: new Date().toISOString() });

    try {
      const decoded = decodeZATCAQR(qrData);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!validateVATNumber(decoded.vatNumber)) {
        errors.push(`رقم ضريبي غير صالح: ${decoded.vatNumber}`);
      }
      if (!validateTimestamp(decoded.timestamp)) {
        errors.push(`تاريخ غير صالح: ${decoded.timestamp}`);
      }
      if (decoded.totalAmount <= 0) {
        errors.push(`مبلغ غير صالح: ${decoded.totalAmount}`);
      }

      const expectedVat = decoded.totalAmount * 0.15;
      if (Math.abs(decoded.vatAmount - expectedVat) > 0.01) {
        warnings.push(`الضريبة (${decoded.vatAmount}) لا تطابق 15% من الإجمالي (${expectedVat.toFixed(2)})`);
      }

      const status = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

      const verificationResult: VerificationResult = {
        status,
        data: decoded,
        errors,
        warnings,
        timestamp: new Date().toISOString(),
      };

      setResult(verificationResult);
      setHistory((prev) => [verificationResult, ...prev].slice(0, 50));

      // Save to audit log
      db.audit_logs.add({
        id: crypto.randomUUID(),
        action: 'qr_verify',
        entityType: 'invoice',
        entityId: decoded.vatNumber,
        details: JSON.stringify({ status, errors, warnings }),
        performedAt: new Date().toISOString(),
        userId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
    } catch (e: any) {
      setResult({
        status: 'error',
        data: null,
        errors: [e.message || 'فشل فك تشفير QR Code'],
        warnings: [],
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const statusConfig: Record<VerificationStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    idle: { color: 'text-on-surface-variant', bg: 'bg-surface-container-high', icon: <ScanLine className="w-8 h-8" />, label: 'جاهز للمسح' },
    scanning: { color: 'text-primary', bg: 'bg-primary/10', icon: <Camera className="w-8 h-8 animate-pulse" />, label: 'جاري المسح...' },
    verifying: { color: 'text-warning', bg: 'bg-warning/10', icon: <RefreshCw className="w-8 h-8 animate-spin" />, label: 'جاري التحقق...' },
    valid: { color: 'text-tertiary', bg: 'bg-tertiary/10', icon: <CheckCircle className="w-8 h-8" />, label: 'فاتورة صالحة ✓' },
    invalid: { color: 'text-error', bg: 'bg-error/10', icon: <XCircle className="w-8 h-8" />, label: 'فاتورة مرفوضة ✗' },
    warning: { color: 'text-warning', bg: 'bg-warning/10', icon: <AlertTriangle className="w-8 h-8" />, label: 'تحذير ⚠' },
    error: { color: 'text-error', bg: 'bg-error/10', icon: <XCircle className="w-8 h-8" />, label: 'خطأ في القراءة' },
  };

  const cfg = statusConfig[result.status];

  return (
    <div className="flex flex-col h-full gap-4 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-cairo text-headline-md font-bold text-on-surface">التحقق من الفواتير</h1>
            <p className="text-body-sm text-on-surface-variant">مسح QR Code والتحقق من ZATCA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-tertiary/10 text-tertiary rounded-full text-label-sm">
              <Wifi className="w-3.5 h-3.5" /> متصل
            </span>
          ) : (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-warning/10 text-warning rounded-full text-label-sm">
              <WifiOff className="w-3.5 h-3.5" /> وضع عدم اتصال
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left: Scanner */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-outline-variant/10 p-6 flex flex-col">
          {/* Scan Mode Selector */}
          <div className="flex gap-2 mb-4">
            {[
              { mode: 'manual' as const, icon: <Keyboard className="w-4 h-4" />, label: 'إدخال يدوي' },
              { mode: 'camera' as const, icon: <Camera className="w-4 h-4" />, label: 'كاميرا' },
              { mode: 'usb' as const, icon: <ScanLine className="w-4 h-4" />, label: 'جهاز USB' },
            ].map((m) => (
              <button
                key={m.mode}
                onClick={() => { setScanMode(m.mode); if (m.mode === 'camera') startCamera(); else stopCamera(); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-label-md transition-all ${
                  scanMode === m.mode
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Manual Input */}
          {scanMode === 'manual' && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleVerify(manualInput); setManualInput(''); } }}
                placeholder="الصق بيانات QR Code هنا..."
                className="flex-1 px-4 py-3 border border-outline-variant/20 rounded-lg text-right bg-surface-container-lowest font-mono focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => { handleVerify(manualInput); setManualInput(''); }}
                disabled={!manualInput.trim()}
                className="px-6 py-3 bg-primary text-on-primary rounded-lg font-label-lg hover:bg-primary-container transition-all disabled:opacity-40"
              >
                تحقق
              </button>
            </div>
          )}

          {/* Camera Scanner */}
          {scanMode === 'camera' && (
            <div className="relative mb-4 rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline />
              <canvas ref={canvasRef} className="hidden" />
              {cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-primary rounded-xl animate-pulse" />
                </div>
              )}
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>اضغط لتشغيل الكاميرا</p>
                    <button onClick={startCamera} className="mt-2 px-4 py-2 bg-primary text-on-primary rounded-lg">
                      تشغيل الكاميرا
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USB Scanner Mode */}
          {scanMode === 'usb' && (
            <div className="mb-4 p-6 bg-surface-container-low rounded-xl text-center">
              <ScanLine className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse" />
              <p className="text-body-md text-on-surface-variant">جاري انتظار المسح من جهاز الباركود...</p>
              <p className="text-body-sm text-on-surface-variant mt-1">امسح QR Code بأي جهاز USB/Bluetooth موصول</p>
            </div>
          )}

          {/* Verification Result */}
          <div className={`flex-1 rounded-xl p-6 ${cfg.bg} transition-all`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cfg.color}>{cfg.icon}</div>
              <h3 className={`font-cairo text-headline-sm font-bold ${cfg.color}`}>{cfg.label}</h3>
            </div>

            {result.data && (
              <div className="space-y-3 bg-surface-container-lowest/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-body-sm text-on-surface-variant">اسم البائع</span>
                    <p className="text-label-md text-on-surface">{result.data.sellerName}</p>
                  </div>
                  <div>
                    <span className="text-body-sm text-on-surface-variant">الرقم الضريبي</span>
                    <p className="text-label-md text-on-surface font-mono">{result.data.vatNumber}</p>
                  </div>
                  <div>
                    <span className="text-body-sm text-on-surface-variant">التاريخ</span>
                    <p className="text-label-md text-on-surface">{new Date(result.data.timestamp).toLocaleString('ar-DZ')}</p>
                  </div>
                  <div>
                    <span className="text-body-sm text-on-surface-variant">الإجمالي</span>
                    <p className="text-headline-sm font-bold text-primary">{result.data.totalAmount.toFixed(2)} دج</p>
                  </div>
                  <div>
                    <span className="text-body-sm text-on-surface-variant">الضريبة (15%)</span>
                    <p className="text-label-md text-on-surface">{result.data.vatAmount.toFixed(2)} دج</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-error/10 rounded-lg p-3">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-body-sm text-error flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0" /> {err}
                      </p>
                    ))}
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <div className="bg-warning/10 rounded-lg p-3">
                    {result.warnings.map((warn, i) => (
                      <p key={i} className="text-body-sm text-warning flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {warn}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {result.status === 'idle' && (
              <div className="text-center py-8 text-on-surface-variant">
                <ScanLine className="w-16 h-16 mx-auto mb-3 opacity-20" />
                <p className="text-body-md">اختر طريقة المسح وأمسح QR Code من الفاتورة</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: History */}
        <div className="bg-surface rounded-xl border border-outline-variant/10 flex flex-col">
          <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
            <h3 className="font-cairo text-label-lg font-bold text-on-surface flex items-center gap-2">
              <Clock className="w-4 h-4" /> سجل التحقق
            </h3>
            <span className="text-body-sm text-on-surface-variant">{history.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {history.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-body-sm">لا توجد عمليات تحقق بعد</p>
              </div>
            ) : (
              history.map((item, i) => {
                const itemCfg = statusConfig[item.status];
                return (
                  <div key={i} className={`p-3 rounded-lg ${itemCfg.bg} transition-all`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-label-sm font-bold ${itemCfg.color}`}>
                        {item.status === 'valid' ? 'صالحة' : item.status === 'invalid' ? 'مرفوضة' : 'تحذير'}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        {new Date(item.timestamp).toLocaleTimeString('ar-DZ')}
                      </span>
                    </div>
                    {item.data && (
                      <div className="text-body-xs text-on-surface-variant">
                        <p>{item.data.sellerName} — {item.data.totalAmount.toFixed(2)} دج</p>
                        <p className="font-mono">{item.data.vatNumber}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
