// scannerSound — BARCODE-MGMT-001
// أصوات ماسح الباركود عبر WebAudio API (لا مكتبة خارجية)
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

/** يجب استدعاؤها بعد أول تفاعل مستخدم لفتح الـ context (سياسات المتصفح) */
export function unlockAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

export function playBeep(freq = 880, durationMs = 80, volume = 0.1): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  const dur = durationMs / 1000;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur);
}

/** صوت نجاح المسح: نغمة واحدة مرتفعة قصيرة */
export function playScanOk(volume = 0.1): void {
  playBeep(880, 70, volume);
}

/** صوت الإضافة الناجحة: نغمتان متصاعدان */
export function playAdded(volume = 0.1): void {
  playBeep(740, 60, volume);
  setTimeout(() => playBeep(920, 70, volume), 70);
}

/** صوت خطأ: نغمتان منخفضتان طويلتان */
export function playErrorBeep(volume = 0.12): void {
  playBeep(220, 130, volume);
  setTimeout(() => playBeep(180, 160, volume), 140);
}
