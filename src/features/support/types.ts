import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

export interface GuideStep {
  title: string;
  desc: string;
  badge?: string;
}

export interface InteractiveGuide {
  id: string;
  category: string;
  title: string;
  shortDesc: string;
  timeEstimate: string;
  icon: ComponentType<LucideProps>;
  iconColor: string;
  iconBg: string;
  route: string;
  routeLabel: string;
  proTip: string;
  shortcuts?: { key: string; label: string }[];
  steps: GuideStep[];
}

export interface FaqItem {
  id: string;
  category: string;
  q: string;
  a: string;
  keywords: string[];
}

export interface SystemFeature {
  id: string;
  category: string;
  title: string;
  badge: string;
  desc: string;
  highlights: string[];
  icon: ComponentType<LucideProps>;
  iconColor: string;
  iconBg: string;
  route: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  badge?: string;
  steps?: string[];
  proTip?: string;
  route?: string;
  routeLabel?: string;
  suggestedQuestions?: string[];
}

export const SUPPORT_CATEGORIES = [
  'الكل',
  'العبوات والمفضلة (تصميم 5)',
  'نقطة البيع (POS) والتصاميم',
  'الطباعة الحرارية وفاتورة الجملة',
  'المخزون والعائلات',
  'ملصقات الباركود',
  'الهاتف والشبكة والأجهزة',
  'الصندوق والمصاريف',
  'العملاء والديون',
  'الموردون والمشتريات',
  'الباقات والعروض',
  'دقة الشاشة والعرض',
  'الأمان والنسخ الاحتياطي',
] as const;

export type CategoryType = (typeof SUPPORT_CATEGORIES)[number];

export type ViewTab = 'assistant' | 'guides' | 'features' | 'faqs' | 'contact';

export interface SupportTicketForm {
  subject: string;
  category: string;
  message: string;
  phone: string;
}

export interface SupportContactInfo {
  phone1: string;
  phone2: string;
  phone1Raw: string;
  phone2Raw: string;
  whatsappUrl1: string;
  whatsappUrl2: string;
  supportEmail: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
}
