import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

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

    // الاستماع الفوري لتعديلات قاعدة البيانات المنبعثة من Electron Main عبر IPC
    const api = (window as any).electronAPI;
    if (api?.db?.onTableUpdated) {
      const unsubscribe = api.db.onTableUpdated((payload: { table?: string; action?: string; id?: string }) => {
        const table = payload?.table;
        if (table) {
          // تحديث فوري لكافة الكويريز المرتبطة بالجدول المعدل
          queryClient.invalidateQueries({ queryKey: [table] });

          if (table === "settings") {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            queryClient.invalidateQueries({ queryKey: ["network_settings"] });
          } else if (table === "products" || table === "categories") {
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
          } else if (table === "sales" || table === "sales_items") {
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["cash_sessions"] });
            queryClient.invalidateQueries({ queryKey: ["customers"] });
          } else if (table === "cash_sessions" || table === "cash_transactions") {
            queryClient.invalidateQueries({ queryKey: ["cash_sessions"] });
            queryClient.invalidateQueries({ queryKey: ["cash"] });
          } else if (table === "users" || table === "roles") {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["roles"] });
          }
        } else {
          queryClient.invalidateQueries();
        }
      });

      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
