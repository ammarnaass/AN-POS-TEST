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

/**
 * فك تعليق واستئناف محرك الصوت عند أول تفاعل
 */
export function unlockNotificationAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

// الربط التلقائي بفك التعليق عند أول نقرة أو ضغطة زر في المتصفح أو تطبيق Electron
if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockNotificationAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });
}

function playTone(freq: number, startTimeOffsetSec: number, durationSec: number, volume = 0.15) {
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
 * تشغيل نغمة تنبيه تفاعلية مسموعة ومريحة بحسب نوع الإشعار
 */
export function playNotificationChime(type: NotificationType = 'info', volume = 0.15): void {
  try {
    unlockNotificationAudio();

    switch (type) {
      case 'success':
        // نغمة نجاح صاعدة مريحة وعصرية (C5 -> E5 -> G5)
        playTone(523.25, 0, 0.12, volume * 0.9);
        playTone(659.25, 0.08, 0.14, volume * 1.0);
        playTone(783.99, 0.16, 0.22, volume * 1.2);
        break;

      case 'warning':
        // نغمة تحذير تنبيهية دافئة وواضحة (A4 -> E5)
        playTone(440.0, 0, 0.12, volume * 1.1);
        playTone(659.25, 0.09, 0.20, volume * 1.1);
        break;

      case 'error':
        // نغمة خطأ/تنبيه حرج (F4 -> D4)
        playTone(349.23, 0, 0.14, volume * 1.3);
        playTone(293.66, 0.11, 0.22, volume * 1.3);
        break;

      case 'info':
      default:
        // نغمة معلومة لطيفة مزدوجة (E5 -> A5)
        playTone(659.25, 0, 0.14, volume * 0.9);
        playTone(880.0, 0.08, 0.18, volume * 1.0);
        break;
    }
  } catch {
    // كتم أي خطأ غير متوقع في محرك الصوت لعدم تعطيل عمل التطبيق
  }
}
