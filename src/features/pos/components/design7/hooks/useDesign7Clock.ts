import { useState, useEffect } from 'react';

export function useDesign7Clock() {
  const [timeStr, setTimeStr] = useState<string>(() => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  });

  const [dateStr, setDateStr] = useState<string>(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0]);
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setDateStr(`${day}/${month}/${year}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { timeStr, dateStr };
}
