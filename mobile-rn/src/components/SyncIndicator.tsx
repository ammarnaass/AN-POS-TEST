import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSyncEngine } from '@/lib/syncEngine';
import { WifiOff, RefreshCw, AlertCircle, Smartphone } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '@/theme';

export default function SyncIndicator() {
  const {
    isOnline,
    isConnected,
    isSyncing,
    pendingCount,
    failedCount,
    connectionMode,
    processQueue,
    retryFailed,
  } = useSyncEngine();

  if (isOnline && isConnected && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  const bgColor = !isOnline
    ? colors.danger.light
    : !isConnected
    ? colors.warning.light
    : isSyncing
    ? colors.primary[50]
    : failedCount > 0
    ? colors.danger.light
    : colors.indigo[50];

  const borderColor = !isOnline
    ? colors.danger.border
    : !isConnected
    ? colors.warning.border
    : isSyncing
    ? colors.primary[200]
    : failedCount > 0
    ? colors.danger.border
    : colors.indigo[200];

  const textColor = !isOnline
    ? colors.danger.main
    : !isConnected
    ? colors.warning.dark
    : isSyncing
    ? colors.primary[600]
    : failedCount > 0
    ? colors.danger.main
    : colors.indigo[600];

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {!isOnline ? (
        <>
          <WifiOff size={13} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>غير متصل</Text>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: textColor + '20' }]}>
              <Text style={[styles.badgeText, { color: textColor }]}>{pendingCount}</Text>
            </View>
          )}
        </>
      ) : !isConnected ? (
        <>
          <Smartphone size={13} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>وضع مستقل</Text>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={13} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>جاري المزامنة...</Text>
        </>
      ) : failedCount > 0 ? (
        <>
          <AlertCircle size={13} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>{failedCount} فاشلة</Text>
          <TouchableOpacity onPress={retryFailed} activeOpacity={0.7}>
            <Text style={[styles.link, { color: textColor }]}>إعادة</Text>
          </TouchableOpacity>
        </>
      ) : pendingCount > 0 ? (
        <>
          <RefreshCw size={13} color={textColor} />
          <Text style={[styles.text, { color: textColor }]}>{pendingCount} بالانتظار</Text>
          <TouchableOpacity onPress={processQueue} activeOpacity={0.7}>
            <Text style={[styles.link, { color: textColor }]}>مزامنة</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Cairo',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  link: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

