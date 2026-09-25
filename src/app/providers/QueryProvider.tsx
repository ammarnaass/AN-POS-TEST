import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { initSyncBridge } from "@/lib/syncBridge";
import { realtimeEventBus } from "@/lib/realtimeEventBus";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export default function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // تشغيل جسر المزامنة الحي الموحد (SQLite ↔ Dexie ↔ React Query)
    const cleanupSyncBridge = initSyncBridge(queryClient);

    // تشغيل محرك الأحداث اللحظية المباشرة (WebSockets & SSE Event Bus)
    const cleanupRealtimeBus = realtimeEventBus.init(queryClient);

    return () => {
      if (typeof cleanupSyncBridge === "function") cleanupSyncBridge();
      if (typeof cleanupRealtimeBus === "function") cleanupRealtimeBus();
    };
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
