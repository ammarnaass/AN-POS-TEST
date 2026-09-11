import React, { useState } from 'react';
import {
  X,
  Headphones,
  Phone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Clock,
  ShieldCheck,
  Globe,
  Video,
  Send,
  Sparkles,
} from 'lucide-react';

interface SupportChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hardwareFingerprint?: string;
  shopName?: string;
}

export default function SupportChannelsModal({
  isOpen,
  onClose,
  hardwareFingerprint = '',
  shopName = 'AN POS',
}: SupportChannelsModalProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  if (!isOpen) return null;

  const phone1 = '0555 22 06 20';
  const phone1Raw = '0555220620';
  const phone2 = '0674 78 48 59';
  const phone2Raw = '0674784859';
  const supportEmail = 'andev20000@gmail.com';
  const facebookUrl = 'https://www.facebook.com/profile.php?id=61591569137725';
  const instagramUrl = 'https://www.instagram.com/andev2000?fbclid=IwY2xjawUQkQ9wZG9mBWV4dG4DYWVtAjEwAGJyaWQRMXlGZGpkNEM4MFM1dUtZTkJzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEeAAZWiIYeIuwBhaRc88BIn6Q2ZywC3vbJXcN4G8DuNb0aiUhhlmEnKmJ3Ra8_aem_-OaaqMAitpVBgPx2ePIGLA';
  const youtubeUrl = 'https://youtube.com/@andev20?si=lEgm3MCiWbede7de';

  const defaultMessage = `السلام عليكم، أحتاج كود تفعيل لنظام ${shopName}.${hardwareFingerprint ? `\nبصمة جهازي:\n${hardwareFingerprint}` : ''}`;

  const whatsappUrl1 = `https://wa.me/213555220620?text=${encodeURIComponent(defaultMessage)}`;
  const whatsappUrl2 = `https://wa.me/213674784859?text=${encodeURIComponent(defaultMessage)}`;
  const emailUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(`طلب تفعيل نظام ${shopName}`)}&body=${encodeURIComponent(defaultMessage)}`;

  const handleCopy = (text: string, identifier: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedItem(identifier);
    setTimeout(() => {
      setCopiedItem((current) => (current === identifier ? null : current));
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-surface-container-low dark:bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-2xl overflow-hidden text-on-surface animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 pb-4 border-b border-outline-variant/15 bg-gradient-to-r from-primary/10 via-surface-container-low to-primary/5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black font-cairo text-on-surface">
                    قنوات الدعم الفني والتفعيل
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    متاح للرد الفوري
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-tajawal mt-1">
                  تواصل معنا مباشرة عبر أي من القنوات المعتمدة للحصول على كود التفعيل أو المساعدة الفنية.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-outline-variant/20 hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* بطاقة بصمة الجهاز والنسخ السريع */}
          {hardwareFingerprint && (
            <div className="p-4 rounded-2xl bg-surface-container border border-primary/25 bg-gradient-to-br from-primary/5 via-surface-container to-surface-container space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold font-cairo text-on-surface">
                    بصمة هذا الجهاز (Hardware Fingerprint)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(hardwareFingerprint, 'fp')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-cairo bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
                >
                  {copiedItem === 'fp' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">تم نسخ البصمة</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ البصمة</span>
                    </>
                  )}
                </button>
              </div>

              <div className="font-mono text-xs font-bold text-on-surface bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 select-all break-all dir-ltr text-center">
                {hardwareFingerprint}
              </div>

              <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-tajawal">
                <span>أرسل هذه البصمة لفريق الدعم ليتم توليد كود التفعيل المخصص لهذا الجهاز فوراً.</span>
                <button
                  type="button"
                  onClick={() => handleCopy(defaultMessage, 'msg')}
                  className="text-primary hover:underline font-bold font-cairo cursor-pointer shrink-0 mr-2"
                >
                  {copiedItem === 'msg' ? '✓ تم نسخ الرسالة' : 'نسخ الرسالة الجاهزة'}
                </button>
              </div>
            </div>
          )}

          {/* قنوات الواتساب (WhatsApp Direct) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold font-cairo text-on-surface">
                المحادثة المباشرة عبر واتساب (تفعيل فوري)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* خط واتساب 1 */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/25 transition-all flex flex-col justify-between gap-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      الخط الرئيسي 1
                    </span>
                    <p className="text-sm font-bold font-mono text-on-surface mt-1.5 dir-ltr text-right">
                      {phone1}
                    </p>
                    <p className="text-[11px] text-on-surface-variant font-tajawal mt-0.5">
                      تفعيل التراخيص، الاستفسارات السريعة، الدعم الفني
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={whatsappUrl1}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>محادثة واتساب</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(phone1Raw, 'p1')}
                    className="w-10 h-10 rounded-xl border border-outline-variant/25 hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
                    title="نسخ الرقم"
                  >
                    {copiedItem === 'p1' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* خط واتساب 2 */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/25 transition-all flex flex-col justify-between gap-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      خط الدعم 2
                    </span>
                    <p className="text-sm font-bold font-mono text-on-surface mt-1.5 dir-ltr text-right">
                      {phone2}
                    </p>
                    <p className="text-[11px] text-on-surface-variant font-tajawal mt-0.5">
                      خدمة ما بعد البيع، ربط الهواتف والشبكات
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={whatsappUrl2}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>محادثة واتساب</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopy(phone2Raw, 'p2')}
                    className="w-10 h-10 rounded-xl border border-outline-variant/25 hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
                    title="نسخ الرقم"
                  >
                    {copiedItem === 'p2' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* الاتصال الهاتفي والبريد الإلكتروني */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* بطاقة الاتصال الهاتفي المباشر */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold font-cairo text-on-surface">
                  الاتصال الهاتفي المباشر
                </span>
              </div>

              <div className="space-y-2">
                <a
                  href={`tel:${phone1Raw}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 transition-all text-xs font-mono font-bold text-on-surface"
                >
                  <span className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span className="dir-ltr">{phone1}</span>
                  </span>
                  <span className="text-[11px] font-cairo font-bold text-primary">اتصال الآن</span>
                </a>

                <a
                  href={`tel:${phone2Raw}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 transition-all text-xs font-mono font-bold text-on-surface"
                >
                  <span className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span className="dir-ltr">{phone2}</span>
                  </span>
                  <span className="text-[11px] font-cairo font-bold text-primary">اتصال الآن</span>
                </a>
              </div>
            </div>

            {/* بطاقة البريد الإلكتروني الرسمي */}
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold font-cairo text-on-surface">
                    البريد الإلكتروني الرسمي
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-on-surface bg-surface-container-low p-2 rounded-lg border border-outline-variant/15 text-center dir-ltr">
                  {supportEmail}
                </p>
                <p className="text-[11px] text-on-surface-variant font-tajawal mt-1.5">
                  للطلبات الرسمية والشركات وعروض الأسعار والفواتير.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={emailUrl}
                  className="flex-1 h-9 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>إرسال بريد</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(supportEmail, 'email')}
                  className="w-9 h-9 rounded-xl border border-outline-variant/25 hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0"
                  title="نسخ البريد"
                >
                  {copiedItem === 'email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* منصات التواصل الاجتماعي ومكتبة الشروحات */}
          <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold font-cairo text-on-surface">
                  المنصات الرسمية والشروحات
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant font-tajawal">
                تحديثات مستمرة ودروس فيديو
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 flex items-center justify-between text-xs font-cairo font-bold text-on-surface hover:text-primary transition-all group"
              >
                <span>صفحة فيسبوك</span>
                <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-primary" />
              </a>

              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 flex items-center justify-between text-xs font-cairo font-bold text-on-surface hover:text-primary transition-all group"
              >
                <span>حساب إنستغرام</span>
                <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-primary" />
              </a>

              <a
                href={youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/15 flex items-center justify-between text-xs font-cairo font-bold text-on-surface hover:text-primary transition-all group"
              >
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-red-500" />
                  <span>قناة يوتيوب</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-primary" />
              </a>
            </div>
          </div>

          {/* أوقات العمل والضمان */}
          <div className="p-3.5 rounded-2xl bg-surface-container-high/60 border border-outline-variant/15 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-on-surface-variant font-tajawal">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>
                <strong>ساعات العمل الرسمية:</strong> السبت إلى الخميس (08:00 ص - 22:00 م) | دعم الطوارئ 24/7
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
              <span>تفعيل محلي فوري</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/15 bg-surface-container-low flex items-center justify-between shrink-0 text-xs">
          <span className="text-on-surface-variant font-tajawal text-[11px]">
            نظام AN POS Pro — دعم تقني معتمد وتفعيل محلي دون الحاجة للإنترنت
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl font-bold font-cairo transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
