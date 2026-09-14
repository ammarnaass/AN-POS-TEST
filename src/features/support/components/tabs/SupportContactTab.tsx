import React from 'react';
import { Phone, MessageCircle, Mail, Send } from 'lucide-react';
import type { SupportContactInfo } from '../../types';

interface SupportContactTabProps {
  contactInfo?: SupportContactInfo;
  openTicketModal: () => void;
}

export const SupportContactTab: React.FC<SupportContactTabProps> = ({
  contactInfo,
  openTicketModal,
}) => {
  const safeContact: SupportContactInfo = {
    phone1: contactInfo?.phone1 || '0666 52 60 21',
    phone2: contactInfo?.phone2 || '0674 48 88 43',
    phone1Raw: contactInfo?.phone1Raw || '0666526021',
    phone2Raw: contactInfo?.phone2Raw || '0674488843',
    whatsappUrl1: contactInfo?.whatsappUrl1 || 'https://wa.me/213666526021',
    whatsappUrl2: contactInfo?.whatsappUrl2 || 'https://wa.me/213674488843',
    supportEmail: contactInfo?.supportEmail || 'andev2000@gmail.com',
    facebookUrl: contactInfo?.facebookUrl || 'https://facebook.com',
    instagramUrl: contactInfo?.instagramUrl || 'https://instagram.com/andev2000',
    youtubeUrl: contactInfo?.youtubeUrl || 'https://youtube.com/@andev20',
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-outline-variant/10 pb-4 px-1">
        <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          قنوات الدعم الفني والتواصل المباشر
        </h2>
        <p className="text-xs text-on-surface-variant">
          فريق المهندسين والدعم الفني متاح لمساعدتك عبر الهاتف، الواتساب، أو عبر فتح تذكرة دعم برمجية فورية
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Card */}
        <div className="glass-card rounded-3xl p-6 text-center border border-emerald-500/30 bg-surface-container/70 flex flex-col justify-between space-y-4 shadow-sm hover:border-emerald-500/50 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mx-auto shadow-sm">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-on-surface font-cairo">محادثة واتساب فورية</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              تواصل مباشرة مع فريق الخبراء عبر تطبيق WhatsApp للتدخل السريع وحل المشاكل التقنية واستفسارات التشغيل.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-sm font-bold dir-ltr select-all">
              <a
                href={safeContact.whatsappUrl1}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 dark:text-emerald-400 hover:underline px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                {safeContact.phone1}
              </a>
              <span className="text-xs text-on-surface-variant font-cairo">أو</span>
              <a
                href={safeContact.whatsappUrl2}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 dark:text-emerald-400 hover:underline px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                {safeContact.phone2}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={safeContact.whatsappUrl1}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/25"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (1)</span>
            </a>
            <a
              href={safeContact.whatsappUrl2}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/25"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (2)</span>
            </a>
          </div>
        </div>

        {/* Email / Ticket Support */}
        <div className="glass-card rounded-3xl p-6 text-center border border-cyan-500/30 bg-surface-container/70 flex flex-col justify-between space-y-4 shadow-sm hover:border-cyan-500/50 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 mx-auto shadow-sm">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-on-surface font-cairo">تذكرة مساعدة داخلية</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              أرسل بلاغاً أو مشكلة برمجية مشفوعة ببيانات إصدار النظام وقاعدة البيانات للمتابعة.
            </p>
            <p className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 dir-ltr select-all">
              {safeContact.supportEmail}
            </p>
          </div>
          <button
            onClick={openTicketModal}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-600/25"
          >
            <Send className="w-4 h-4" />
            <span>فتح تذكرة داخلية</span>
          </button>
        </div>

        {/* Emergency Phone Support */}
        <div className="glass-card rounded-3xl p-6 text-center border border-amber-500/30 bg-surface-container/70 flex flex-col justify-between space-y-4 shadow-sm hover:border-amber-500/50 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 mx-auto shadow-sm">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-on-surface font-cairo">الاتصال الهاتفي المباشر</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              للحالات العاجلة وانقطاع العمل في أوقات الذروة، متاح من السبت إلى الخميس (08:00 - 20:00).
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-sm font-bold dir-ltr select-all">
              <a
                href={`tel:${safeContact.phone1Raw}`}
                className="text-amber-800 dark:text-amber-300 hover:underline px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                {safeContact.phone1}
              </a>
              <span className="text-xs text-on-surface-variant font-cairo">أو</span>
              <a
                href={`tel:${safeContact.phone2Raw}`}
                className="text-amber-800 dark:text-amber-300 hover:underline px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                {safeContact.phone2}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${safeContact.phone1Raw}`}
              className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/25"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>اتصال (1)</span>
            </a>
            <a
              href={`tel:${safeContact.phone2Raw}`}
              className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/25"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>اتصال (2)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
