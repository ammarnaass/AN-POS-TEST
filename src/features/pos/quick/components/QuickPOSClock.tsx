import React, { useState, useEffect } from 'react';

export const QuickPOSClock: React.FC<{ className?: string }> = React.memo(({ className }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'م' : 'ص';
      hours = hours % 12 || 12;
      setTimeStr(`${hours}:${minutes}:${seconds} ${ampm}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className={className || 'font-mono text-slate-300 font-medium text-xs'}>
      {timeStr}
    </span>
  );
});
