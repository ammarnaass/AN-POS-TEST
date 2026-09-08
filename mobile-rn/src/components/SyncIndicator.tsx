import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useSyncEngine } from '@/lib/syncEngine';
import { WifiOff, RefreshCw, AlertCircle, Smartphone, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing } from '@/theme/tokens';
import PairedDeviceCard from '@/components/PairedDeviceCard';

export default function SyncIndicator() {
  const { isDark, colors } = useTheme();
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);

  const {
    isOnline,
    isConnected,
    isSyncing,
    pendingCount,
    failedCount,
    connectionMode,
    pairedDevice,
    processQueue,
    retryFailed,
  } = useSyncEngine();

  const isFullySyncedConnected = isOnline && isConnected && pendingCount === 0 && failedCount === 0 && !isSyncing;

  const bgColor = !isOnline
    ? colors.danger.light
    : !isConnected
    ? colors.warning.light
    : isSyncing
    ? (isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50])
    : failedCount > 0
    ? colors.danger.light
    : isFullySyncedConnected
    ? (isDark ? 'rgba(16, 185, 129, 0.15)' : colors.emerald[50])
    : (isDark ? 'rgba(99, 102, 241, 0.15)' : colors.indigo[50]);

  const borderColor = !isOnline
    ? colors.danger.border
    : !isConnected
    ? colors.warning.border
    : isSyncing
    ? (isDark ? colors.primary[700] : colors.primary[200])
    : failedCount > 0
    ? colors.danger.border
    : isFullySyncedConnected
    ? (isDark ? colors.emerald[800] : colors.emerald[200])
    : (isDark ? colors.indigo[700] : colors.indigo[200]);

  const textColor = !isOnline
    ? colors.danger.main
    : !isConnected
    ? colors.warning.text
    : isSyncing
    ? colors.primary[600]
    : failedCount > 0
    ? colors.danger.main
    : isFullySyncedConnected
    ? (isDark ? colors.emerald[400] : colors.emerald[700])
    : (isDark ? '#818cf8' : colors.indigo[600]);

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: bgColor, borderColor }]}
        onPress={() => {
          if (isConnected || pairedDevice) {
            setModalVisible(true);
          }
        }}
        activeOpacity={0.8}
      >
        {!isOnline ? (
          <>
            <WifiOff size={13} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{t('common.offline')}</Text>
            {pendingCount > 0 && (
              <View style={[styles.badge, { backgroundColor: textColor + '20' }]}>
                <Text style={[styles.badgeText, { color: textColor }]}>{pendingCount}</Text>
              </View>
            )}
          </>
        ) : !isConnected ? (
          <>
            <Smartphone size={13} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{t('settings.standalone')}</Text>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw size={13} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{t('common.syncing')}</Text>
          </>
        ) : failedCount > 0 ? (
          <>
            <AlertCircle size={13} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{failedCount} {t('settings.syncFailed')}</Text>
            <TouchableOpacity onPress={retryFailed} activeOpacity={0.7}>
              <Text style={[styles.link, { color: textColor }]}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw size={13} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{pendingCount} {t('settings.syncPending')}</Text>
            <TouchableOpacity onPress={processQueue} activeOpacity={0.7}>
              <Text style={[styles.link, { color: textColor }]}>{t('common.sync')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.greenDot, { backgroundColor: colors.emerald[500] }]} />
            <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
              {pairedDevice?.shopName || t('common.online')}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Paired Device Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {t('pair.pairedDevice')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <PairedDeviceCard
              device={pairedDevice}
              onPressUnpair={() => setModalVisible(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    maxWidth: 120,
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
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
