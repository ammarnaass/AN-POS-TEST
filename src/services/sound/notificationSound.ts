// notificationSound.ts — نغمات التنبيهات التفاعلية عبر Web Audio API
import type { NotificationType } from '@/store/notificationStore';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

export function unlockNotificationAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

function playTone(freq: number, startTimeOffsetSec: number, durationSec: number, volume = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTimeOffsetSec);

  const start = ctx.currentTime + startTimeOffsetSec;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + durationSec);
}

/**
 * تشغيل نغمة تنبيه تفاعلية ناعمة بحسب نوع الإشعار
 */
export function playNotificationChime(type: NotificationType = 'info', volume = 0.07): void {
  try {
    switch (type) {
      case 'success':
        // نغمة نجاح صاعدة متناسقة ومريحة (C5 -> G5)
        playTone(523.25, 0, 0.12, volume);
        playTone(783.99, 0.09, 0.22, volume * 1.1);
        break;

      case 'warning':
        // نغمة تحذير تنبيهية دافئة (A4 -> E5)
        playTone(440.0, 0, 0.1, volume);
        playTone(659.25, 0.08, 0.18, volume);
        break;

      case 'error':
        // نغمة خطأ/تنبيه حرج (F4 -> D4)
        playTone(349.23, 0, 0.12, volume * 1.2);
        playTone(293.66, 0.1, 0.2, volume * 1.2);
        break;

      case 'info':
      default:
        // نغمة معلومة لطيفة واحدة (E5)
        playTone(659.25, 0, 0.16, volume);
        break;
    }
  } catch {
    // كتم أي خطأ غير متوقع في محرك الصوت لعدم تعطيل عمل التطبيق
  }
}
