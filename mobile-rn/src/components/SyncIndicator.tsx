import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSyncEngine } from '@/lib/syncEngine';
import { WifiOff, RefreshCw, AlertCircle, Smartphone } from 'lucide-react-native';

export default function SyncIndicator() {
  const {
    isOnline, isConnected, isSyncing, pendingCount, failedCount,
    connectionMode,
    processQueue, retryFailed,
  } = useSyncEngine();

  if (isOnline && isConnected && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  const bgColor = !isOnline ? '#fee2e2' : !isConnected ? '#fef9c3' : isSyncing ? '#dbeafe' : failedCount > 0 ? '#fee2e2' : '#ede9fe';
  const textColor = !isOnline ? '#dc2626' : !isConnected ? '#ca8a04' : isSyncing ? '#2563eb' : failedCount > 0 ? '#dc2626' : '#7c3aed';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {!isOnline ? (
        <>
          <WifiOff size={14} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>غير متصل</Text>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: textColor + '30' }]}>
              <Text style={[styles.badgeText, { color: textColor }]}>{pendingCount}</Text>
            </View>
          )}
        </>
      ) : !isConnected ? (
        <>
          <Smartphone size={14} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>وضع مستقل</Text>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={14} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>جاري المزامنة...</Text>
        </>
      ) : failedCount > 0 ? (
        <>
          <AlertCircle size={14} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>{failedCount} فاشلة</Text>
          <TouchableOpacity onPress={retryFailed}>
            <Text style={[styles.link, { color: textColor }]}>إعادة</Text>
          </TouchableOpacity>
        </>
      ) : pendingCount > 0 ? (
        <>
          <RefreshCw size={14} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>{pendingCount} في الانتظار</Text>
          <TouchableOpacity onPress={processQueue}>
            <Text style={[styles.link, { color: textColor }]}>مزامنة</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  text: { fontSize: 12, fontWeight: '500' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  link: { fontSize: 10, textDecorationLine: 'underline' },
});
