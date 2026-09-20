import React, { useState } from 'react';
import {
  Phone,
  MessageCircle,
  Mail,
  Send,
  Copy,
  Check,
  Clock,
  ExternalLink,
  Headphones,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { SupportContactInfo } from '../../types';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '../SupportSocialIcons';

interface SupportContactTabProps {
  contactInfo?: SupportContactInfo;
  openTicketModal: () => void;
}

export const SupportContactTab: React.FC<SupportContactTabProps> = ({
  contactInfo,
  openTicketModal,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const safeContact: SupportContactInfo = {
    phone1: contactInfo?.phone1 || '0555 22 06 20',
    phone2: contactInfo?.phone2 || '0674 78 48 59',
    phone3: contactInfo?.phone3 || '0674 48 88 43',
    phone1Raw: contactInfo?.phone1Raw || '0555220620',
    phone2Raw: contactInfo?.phone2Raw || '0674784859',
    phone3Raw: contactInfo?.phone3Raw || '0674488843',
    whatsappUrl1:
      contactInfo?.whatsappUrl1 ||
      'https://wa.me/213555220620?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D8%A3%D9%88%20%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC%20AN%20POS',
    whatsappUrl2:
      contactInfo?.whatsappUrl2 ||
      'https://wa.me/213674784859?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D8%A3%D9%88%20%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC%20AN%20POS',
    whatsappUrl3:
      contactInfo?.whatsappUrl3 ||
      'https://wa.me/213674488843?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D8%A3%D9%88%20%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D8%AC%20AN%20POS',
    supportEmail: contactInfo?.supportEmail || 'andev2000@gmail.com',
    facebookUrl: contactInfo?.facebookUrl || 'https://facebook.com',
    instagramUrl: contactInfo?.instagramUrl || 'https://instagram.com/andev2000',
    youtubeUrl: contactInfo?.youtubeUrl || 'https://youtube.com/@andev20',
  };

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-cairo">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface-container/60 border border-outline-variant/15 backdrop-blur-md shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              فريق الدعم الفني متصل ومتاح
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary">
              <Sparkles className="w-3 h-3" />
              استجابة فورية
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-on-surface flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-primary" />
            قنوات الدعم الفني والتواصل المباشر
          </h2>
          <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
            فريق المهندسين والدعم الفني متاح لمساعدتك عبر الهاتف، الواتساب، أو عبر فتح تذكرة دعم برمجية فورية.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-left bg-surface-container-high/60 px-4 py-2.5 rounded-2xl border border-outline-variant/20">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface-variant">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>أوقات العمل المباشر</span>
            </div>
            <p className="text-xs font-black text-on-surface mt-0.5">
              السبت - الخميس (08:00 - 20:00)
            </p>
          </div>
        </div>
      </div>

      {/* 2. Bento Grid of Contact Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: WhatsApp Instant Chat */}
        <div className="group relative overflow-hidden rounded-3xl p-6 border border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-surface-container/80 to-surface-container/60 flex flex-col justify-between space-y-5 shadow-sm hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                تدخل سريع
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-on-surface">محادثة واتساب فورية</h3>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                تواصل مباشرة مع فريق الخبراء عبر تطبيق WhatsApp للتدخل السريع وحل المشاكل التقنية واستفسارات التشغيل.
              </p>
            </div>

            {/* Direct Number Badges with Copy Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-on-surface-variant">واتساب 1:</span>
                  <span className="font-mono text-xs font-black text-on-surface dir-ltr select-all">
                    {safeContact.phone1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(safeContact.phone1Raw, 'wa1')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  title="نسخ الرقم"
                >
                  {copiedKey === 'wa1' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-on-surface-variant">واتساب 2:</span>
                  <span className="font-mono text-xs font-black text-on-surface dir-ltr select-all">
                    {safeContact.phone2}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(safeContact.phone2Raw, 'wa2')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  title="نسخ الرقم"
                >
                  {copiedKey === 'wa2' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {safeContact.phone3 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-high/40 border border-outline-variant/15 text-[11px]">
                  <span className="text-on-surface-variant">خط احتياطي:</span>
                  <a
                    href={safeContact.whatsappUrl3}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline dir-ltr"
                  >
                    {safeContact.phone3}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href={safeContact.whatsappUrl1}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/25"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (1)</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
            <a
              href={safeContact.whatsappUrl2}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/25"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (2)</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>

        {/* Card 2: Emergency Direct Phone Call */}
        <div className="group relative overflow-hidden rounded-3xl p-6 border border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-surface-container/80 to-surface-container/60 flex flex-col justify-between space-y-5 shadow-sm hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                حالات الطوارئ
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-on-surface">الاتصال الهاتفي المباشر</h3>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                للحالات العاجلة وانقطاع العمل في أوقات الذروة، متاح من السبت إلى الخميس (08:00 - 20:00).
              </p>
            </div>

            {/* Direct Numbers Display with Copy Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-on-surface-variant">خط اتصال 1:</span>
                  <span className="font-mono text-xs font-black text-on-surface dir-ltr select-all">
                    {safeContact.phone1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(safeContact.phone1Raw, 'tel1')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                  title="نسخ الرقم"
                >
                  {copiedKey === 'tel1' ? (
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-on-surface-variant">خط اتصال 2:</span>
                  <span className="font-mono text-xs font-black text-on-surface dir-ltr select-all">
                    {safeContact.phone2}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(safeContact.phone2Raw, 'tel2')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                  title="نسخ الرقم"
                >
                  {copiedKey === 'tel2' ? (
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-high/40 border border-outline-variant/15 text-[11px] text-on-surface-variant">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>دعم مباشر لضمان استمرارية نشاطك التجاري دون توقف</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href={`tel:${safeContact.phone1Raw}`}
              className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/25"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>اتصال (1)</span>
            </a>
            <a
              href={`tel:${safeContact.phone2Raw}`}
              className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/25"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>اتصال (2)</span>
            </a>
          </div>
        </div>

        {/* Card 3: Internal Ticket & Email Support */}
        <div className="group relative overflow-hidden rounded-3xl p-6 border border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 via-surface-container/80 to-surface-container/60 flex flex-col justify-between space-y-5 shadow-sm hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                متابعة برمجية
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-on-surface">تذكرة مساعدة داخلية</h3>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                أرسل بلاغاً أو مشكلة برمجية مشفوعة ببيانات إصدار النظام وقاعدة البيانات للمتابعة.
              </p>
            </div>

            {/* Email Display */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/80 border border-cyan-500/20">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span className="font-mono text-xs font-black text-cyan-700 dark:text-cyan-300 truncate dir-ltr select-all">
                    {safeContact.supportEmail}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(safeContact.supportEmail, 'email')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-cyan-600 hover:bg-cyan-500/10 transition-colors shrink-0"
                  title="نسخ البريد الإلكتروني"
                >
                  {copiedKey === 'email' ? (
                    <Check className="w-3.5 h-3.5 text-cyan-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-high/40 border border-outline-variant/15 text-[11px] text-on-surface-variant">
                <Zap className="w-3.5 h-3.5 text-cyan-500" />
                <span>يتم إرفاق سجلات التشخيص ومعلومات الإصدار تلقائياً</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={openTicketModal}
              className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-600/25"
            >
              <Send className="w-4 h-4" />
              <span>فتح تذكرة داخلية</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Developer Community & Official Media Channels */}
      <div className="rounded-3xl p-6 border border-outline-variant/20 bg-surface-container/50 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black text-on-surface">
              مجتمع ومحتوى المطور الرسمي — AN POS
            </h3>
          </div>
          <span className="text-[11px] text-on-surface-variant font-medium">
            تابع التحديثات والشروحات الحصرية
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Facebook */}
          <a
            href={safeContact.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-high/70 hover:bg-[#1877F2]/10 border border-outline-variant/20 hover:border-[#1877F2]/40 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <FacebookIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-on-surface group-hover:text-[#1877F2] transition-colors">
                  فيسبوك
                </p>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  الصفحة الرسمية للتحديثات
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-on-surface-variant group-hover:text-[#1877F2] transition-colors" />
          </a>

          {/* Instagram */}
          <a
            href={safeContact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-high/70 hover:bg-[#E4405F]/10 border border-outline-variant/20 hover:border-[#E4405F]/40 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E4405F]/15 text-[#E4405F] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <InstagramIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-on-surface group-hover:text-[#E4405F] transition-colors">
                  إنستغرام
                </p>
                <p className="text-[11px] text-on-surface-variant font-mono font-bold">
                  @andev2000
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-on-surface-variant group-hover:text-[#E4405F] transition-colors" />
          </a>

          {/* YouTube */}
          <a
            href={safeContact.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-high/70 hover:bg-[#FF0000]/10 border border-outline-variant/20 hover:border-[#FF0000]/40 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF0000]/15 text-[#FF0000] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <YoutubeIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-on-surface group-hover:text-[#FF0000] transition-colors">
                  يوتيوب
                </p>
                <p className="text-[11px] text-on-surface-variant font-mono font-bold">
                  @andev20
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-on-surface-variant group-hover:text-[#FF0000] transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
};
