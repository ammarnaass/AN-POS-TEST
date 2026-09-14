import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { SupportContactInfo } from '../types';

export function useSupportData(): {
  contactInfo: SupportContactInfo;
  isLoading: boolean;
} {
  const { data: settingsList, isLoading } = useQuery({
    queryKey: ['support-system-settings'],
    queryFn: async () => {
      try {
        return await db.settings.toArray();
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  const contactInfo = useMemo<SupportContactInfo>(() => {
    const settingsMap = new Map((settingsList || []).map((s) => [s.key, s.value]));

    const phone1Raw = (settingsMap.get('store_phone') as string) || '0666526021';
    const phone2Raw = (settingsMap.get('store_phone2') as string) || '0674488843';

    // Format phone numbers: e.g. 0666 52 60 21
    const formatPhone = (p: string) => {
      const clean = p.replace(/\D/g, '');
      if (clean.length === 10) {
        return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 8)} ${clean.slice(8)}`;
      }
      return p;
    };

    const toWaPhone = (p: string) => {
      const clean = p.replace(/\D/g, '');
      if (clean.startsWith('0')) return `213${clean.slice(1)}`;
      return clean;
    };

    const phone1 = formatPhone(phone1Raw);
    const phone2 = formatPhone(phone2Raw);

    const whatsappUrl1 = `https://wa.me/${toWaPhone(phone1Raw)}?text=${encodeURIComponent(
      'السلام عليكم، أحتاج مساعدة أو استفسار بخصوص برنامج AN POS'
    )}`;
    const whatsappUrl2 = `https://wa.me/${toWaPhone(phone2Raw)}?text=${encodeURIComponent(
      'السلام عليكم، أحتاج مساعدة أو استفسار بخصوص برنامج AN POS'
    )}`;

    const supportEmail = (settingsMap.get('store_email') as string) || 'andev2000@gmail.com';
    const facebookUrl = (settingsMap.get('store_facebook') as string) || 'https://facebook.com';
    const instagramUrl = 'https://instagram.com/andev2000';
    const youtubeUrl = 'https://youtube.com/@andev20';

    return {
      phone1,
      phone2,
      phone1Raw,
      phone2Raw,
      whatsappUrl1,
      whatsappUrl2,
      supportEmail,
      facebookUrl,
      instagramUrl,
      youtubeUrl,
    };
  }, [settingsList]);

  return {
    contactInfo,
    isLoading,
  };
}
