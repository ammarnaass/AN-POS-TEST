import React from 'react';
import {
  Star,
  Box,
  Package,
  Layers,
  Coffee,
  Droplets,
  Zap,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  Box,
  Package,
  Layers,
  Coffee,
  Droplets,
  Zap,
  Sparkles,
  ShoppingBag,
};

export const COLOR_OPTIONS = [
  { hex: '#2563eb', name: 'أزرق ملكي' },
  { hex: '#059669', name: 'زمردي' },
  { hex: '#d97706', name: 'كهرماني' },
  { hex: '#7c3aed', name: 'بنفسجي' },
  { hex: '#e11d48', name: 'قرمزي' },
  { hex: '#0284c7', name: 'سماوي' },
  { hex: '#4f46e5', name: 'نيلي' },
  { hex: '#475569', name: 'رمادي حجري' },
];
