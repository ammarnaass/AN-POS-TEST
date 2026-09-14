import { useState, useRef, useEffect } from 'react';
import type { AssistantMessage } from '../types';
import { findBestAssistantAnswer } from '../services/assistantKnowledgeEngine';

export function useSupportAssistantChat() {
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'مرحباً بك! أنا المساعد الفني الذكي لنظام AN POS، أعمل محلياً 100% دون إنترنت للإجابة على استفسارات تشغيل الكاشير، بيع العبوات في تصميم 5، فواتير الجملة (س3)، وإعدادات الأجهزة والشبكة.',
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      badge: 'الذكاء الفني المحلي',
      proTip: 'اختر أحد الأسئلة المقترحة السريعة بالأسفل أو اكتب سؤالك بلغتك المعتادة.',
      suggestedQuestions: [
        'في عملية البيع لا يضع عدد القطعة العبوة في فاتورة الجملة',
        'كيف أبيع العبوات في المفضلة بتصميم 5 وأعدل عدد القطع؟',
        'ما هو الفرق بين سعر س1 وسعر س3 في العبوات وطباعة فاتورة الجملة؟',
      ],
    },
  ]);

  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAssistantThinking]);

  const handleSendMessage = (customText?: string) => {
    const textToSend = (customText || assistantInput).trim();
    if (!textToSend) return;

    const userMsg: AssistantMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setAssistantInput('');
    setIsAssistantThinking(true);

    setTimeout(() => {
      const responseMsg = findBestAssistantAnswer(textToSend);
      setChatMessages((prev) => [...prev, responseMsg]);
      setIsAssistantThinking(false);
    }, 350);
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'تمت إعادة تعيين المحادثة. كيف يمكنني مساعدتك الآن في نظام AN POS؟',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        badge: 'جلسة جديدة',
        proTip: 'يمكنك تجربة أحد الأسئلة المقترحة بالأسفل.',
        suggestedQuestions: [
          'ما هي أهم اختصارات لوحة المفاتيح لتسريع الكاشير (F1-F12)؟',
          'كيف أربط وأضبط طابعة الإيصالات الحرارية 80mm و 58mm؟',
        ],
      },
    ]);
  };

  return {
    chatMessages,
    assistantInput,
    setAssistantInput,
    isAssistantThinking,
    chatEndRef,
    handleSendMessage,
    handleResetChat,
  };
}
