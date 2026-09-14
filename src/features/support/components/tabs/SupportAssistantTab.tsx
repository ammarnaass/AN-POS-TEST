import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Users,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import type { AssistantMessage } from '../../types';
import { PRESET_QUESTIONS } from '../../constants';

interface SupportAssistantTabProps {
  chatMessages: AssistantMessage[];
  assistantInput: string;
  setAssistantInput: (input: string) => void;
  isAssistantThinking: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  copiedId: string | null;
  handleSendMessage: (customText?: string) => void;
  handleResetChat: () => void;
  handleCopyText: (text: string, id: string) => void;
}

export const SupportAssistantTab: React.FC<SupportAssistantTabProps> = ({
  chatMessages,
  assistantInput,
  setAssistantInput,
  isAssistantThinking,
  chatEndRef,
  copiedId,
  handleSendMessage,
  handleResetChat,
  handleCopyText,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-primary/25 bg-surface-container/70 shadow-lg space-y-6">
        {/* Assistant Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 text-white flex items-center justify-center shadow-md shadow-primary/25">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-on-surface font-cairo">المساعد الفني الذكي التفاعلي</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  يعمل محلياً (Offline 100%)
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                اطرح أي سؤال حول تشغيل الكاشير، بيع العبوات في تصميم 5، فواتير الجملة، أو إعدادات الطابعات والشبكة
              </p>
            </div>
          </div>

          <button
            onClick={handleResetChat}
            className="px-3.5 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-xl border border-outline-variant/20 hover:bg-surface-container-highest transition-all flex items-center gap-1.5 w-fit cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بدء استفسار جديد</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>استفسارات وحالات شائعة جاهزة للإرسال:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.q)}
                className="text-right px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-high hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-outline-variant/15 text-on-surface transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRight className="w-3 h-3 rotate-180 text-primary shrink-0" />
                <span>{item.q}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat History Box */}
        <div className="bg-surface-container-lowest/80 border border-outline-variant/20 rounded-2xl p-4 md:p-6 min-h-[420px] max-h-[560px] overflow-y-auto space-y-4 shadow-inner">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isUser
                      ? 'bg-primary text-white'
                      : 'bg-gradient-to-br from-cyan-600 to-primary text-white'
                  }`}
                >
                  {isUser ? <Users className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-3 ${
                    isUser
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-surface-container border border-outline-variant/20 text-on-surface rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-1.5 text-[11px]">
                    <span className="font-bold flex items-center gap-1">
                      {isUser ? 'أنت' : 'المساعد الفني الذكي'}
                      {msg.badge && (
                        <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary dark:text-cyan-300 font-bold border border-primary/25 text-[10px]">
                          {msg.badge}
                        </span>
                      )}
                    </span>
                    <span className="opacity-70 font-mono">{msg.timestamp}</span>
                  </div>

                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line font-medium">
                    {msg.text}
                  </p>

                  {/* Structured Steps */}
                  {msg.steps && msg.steps.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-xs font-bold text-primary dark:text-cyan-300">خطوات التنفيذ الموصى بها:</div>
                      <div className="space-y-1 text-xs text-on-surface-variant bg-surface-container-high/60 p-3 rounded-xl border border-outline-variant/15">
                        {msg.steps.map((st, i) => (
                          <div key={i} className="leading-relaxed">
                            {st}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pro Tip */}
                  {msg.proTip && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">نصيحة ذهبية: </span>
                        <span>{msg.proTip}</span>
                      </div>
                    </div>
                  )}

                  {/* Suggested Follow-up Questions */}
                  {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <div className="pt-2 border-t border-outline-variant/10 space-y-1.5">
                      <div className="text-[11px] font-bold text-primary dark:text-cyan-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span>استفسارات مقترحة ذات صلة:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedQuestions.map((sq, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(sq)}
                            className="text-right px-2.5 py-1 rounded-lg text-[11px] font-medium bg-surface-container-high hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-outline-variant/20 text-on-surface transition-all cursor-pointer flex items-center gap-1"
                          >
                            <ArrowRight className="w-2.5 h-2.5 rotate-180 text-primary shrink-0" />
                            <span>{sq}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar (Navigate + Copy) */}
                  {!isUser && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/10 text-xs">
                      {msg.route && (
                        <button
                          onClick={() => navigate(msg.route!)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>{msg.routeLabel || 'فتح الشاشة'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 font-bold">تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الرد</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isAssistantThinking && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-primary text-white flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface-variant flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>المساعد الفني يحلل السؤال في قاعدة البيانات المحلية...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2 pt-2"
        >
          <input
            type="text"
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            placeholder="اكتب استفسارك هنا (مثال: كيف أبيع عبوة حليب في س3؟ كيف أربط الهاتف؟)..."
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl pr-4 pl-28 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!assistantInput.trim()}
            className="absolute left-2.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/20"
          >
            <span>إرسال</span>
            <Send className="w-3.5 h-3.5 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
