import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const QuickPOSClock: React.FC = React.memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-1.5 text-xs text-on-surface-variant font-mono px-2">
      <Clock className="w-3.5 h-3.5" />
      <span>
        {currentTime.toLocaleTimeString('ar-DZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    </div>
  );
});
