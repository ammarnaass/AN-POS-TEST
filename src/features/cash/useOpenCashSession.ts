// useOpenCashSession — BARCODE-MGMT-001
// Hook مشترك بين POS و QuickSalePage لإدارة جلسة الصندوق الحالية
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useAuthStore } from '@/store/authStore';
import { v4 as createId } from 'uuid';

export function useOpenCashSession() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data: sessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const currentSession = useMemo(
    () => sessions.find((s) => s.status === 'open') ?? null,
    [sessions],
  );

  const openMutation = useMutation({
    mutationFn: async (openingBalance: number) => {
      const id = createId();
      const allSessions = await db.cash_sessions.toArray();
      const sessionNumber = allSessions.length + 1;
      const now = new Date().toISOString();
      await db.cash_sessions.add({
        id,
        sessionNumber,
        openedBy: currentUser?.name || '',
        openedAt: now,
        closedAt: '',
        openingBalance,
        deposits: [],
        totalSales: 0,
        totalReturns: 0,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
    },
  });

  return {
    currentSession,
    isOpen: currentSession !== null,
    openSession: openMutation.mutate,
    openSessionAsync: openMutation.mutateAsync,
    isPending: openMutation.isPending,
  };
}
