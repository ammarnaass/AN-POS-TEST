import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Monitor,
  RefreshCw,
  LogOut,
  ArrowLeft,
  ArrowRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { removePairedDevice, type PairedDevice } from '@/lib/pairedDeviceStore';
import { session } from '@/lib/apiClient';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import { useSyncEngine, syncEngine } from '@/lib/syncEngine';

export interface PairedDeviceCardProps {
  device?: PairedDevice | null;
  compact?: boolean;
  showActions?: boolean;
  onPressContinue?: () => void;
  onPressUnpair?: () => void;
  onPressRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}

function formatLastSeen(isoString: string | null | undefined, isRTL: boolean): string {
  if (!isoString) return isRTL ? 'غير معروف' : 'Unknown';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 45) return isRTL ? 'الآن' : 'Just now';
    if (diffMin < 60) {
      return isRTL ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
    }
    if (diffHours < 24) {
      return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    }
    return isRTL ? 'منذ أكثر من يوم' : 'Over a day ago';
  } catch {
    return isRTL ? 'غير معروف' : 'Unknown';
  }
}

export default function PairedDeviceCard({
  device: propDevice,
  compact = false,
  showActions = true,
  onPressContinue,
  onPressUnpair,
  onPressRefresh,
  style,
}: PairedDeviceCardProps) {
  const { isDark, colors } = useTheme();
  const { t, isRTL } = useI18n();
  const sync = useSyncEngine();
  const [pinging, setPinging] = useState(false);

  const device = propDevice || sync.pairedDevice;
  if (!device) return null;

  const status = device.lastStatus || (sync.isOnline ? 'online' : 'offline');
  const isOnline = status === 'online';
  const isUnauthorized = status === 'unauthorized';

  const statusColor = isOnline
    ? colors.emerald[500]
    : isUnauthorized
    ? colors.amber[500]
    : colors.slate[400];

  const statusBg = isOnline
    ? isDark ? 'rgba(16, 185, 129, 0.15)' : colors.emerald[50]
    : isUnauthorized
    ? isDark ? 'rgba(245, 158, 11, 0.15)' : colors.amber[50]
    : isDark ? 'rgba(148, 163, 184, 0.12)' : colors.slate[100];

  const statusText = isOnline
    ? t('pair.deviceOnline')
    : isUnauthorized
    ? t('pair.deviceUnauthorized')
    : t('pair.deviceOffline');

  const ActionArrow = isRTL ? ArrowLeft : ArrowRight;

  const handlePing = async () => {
    if (pinging) return;
    setPinging(true);
    try {
      if (onPressRefresh) {
        await onPressRefresh();
      } else {
        await syncEngine.pingNow();
      }
    } finally {
      setPinging(false);
    }
  };

  const handleUnpairConfirm = () => {
    Alert.alert(
      t('pair.unpair'),
      t('pair.unpairConfirm'),
      [
        { text: t('common.cancel') || 'إلغاء', style: 'cancel' },
        {
          text: t('pair.unpair'),
          style: 'destructive',
          onPress: async () => {
            await session.unpair();
            onPressUnpair?.();
          },
        },
      ]
    );
  };

  // Compact View (for headers, login screen, quick pills)
  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          {
            backgroundColor: isDark ? colors.surface : colors.surface,
            borderColor: isOnline ? (isDark ? colors.emerald[800] : colors.emerald[200]) : colors.border.default,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
          style,
        ]}
      >
        <View style={styles.compactLeft}>
          <View style={[styles.compactDot, { backgroundColor: statusColor }]} />
          <Monitor size={14} color={isDark ? colors.text.secondary : colors.text.primary} />
          <Text style={[styles.compactShopName, { color: colors.text.primary }]} numberOfLines={1}>
            {device.shopName || 'AN POS Desktop'}
          </Text>
          <Text style={[styles.compactIp, { color: colors.text.tertiary }]}>
            ({device.ip}:{device.port})
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePing}
          disabled={pinging}
          style={[styles.compactRefreshBtn, { backgroundColor: statusBg }]}
          activeOpacity={0.7}
        >
          {pinging ? (
            <ActivityIndicator size="small" color={statusColor} />
          ) : (
            <RefreshCw size={12} color={statusColor} />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Full Rich Card
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isOnline ? (isDark ? colors.emerald[700] : colors.emerald[300]) : colors.border.default,
        },
        shadows.sm,
        style,
      ]}
    >
      {/* Top Header: Device Name, Shop Name, Status Badge */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconBox, { backgroundColor: statusBg }]}>
          <Monitor size={24} color={statusColor} />
        </View>

        <View style={[styles.titleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.titleBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.shopName, { color: colors.text.primary }]} numberOfLines={1}>
              {device.shopName || 'AN POS Desktop'}
            </Text>
            {device.version ? (
              <View style={[styles.versionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.slate[100] }]}>
                <Text style={[styles.versionText, { color: colors.text.tertiary }]}>v{device.version}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.ipPortText, { color: colors.text.secondary }]}>
            {device.ip}:{device.port}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      {/* Meta Info Bar: Last Seen & Latency */}
      <View style={[styles.metaRow, { borderTopColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Clock size={12} color={colors.text.tertiary} />
          <Text style={[styles.metaLabel, { color: colors.text.tertiary }]}>
            {t('pair.lastSeen')}: {formatLastSeen(device.lastSeenAt, isRTL)}
          </Text>
        </View>

        {isOnline && sync.latencyMs !== null ? (
          <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Activity size={12} color={colors.emerald[600]} />
            <Text style={[styles.metaLabel, { color: colors.emerald[600], fontWeight: '700' }]}>
              {sync.latencyMs} ms
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action Buttons */}
      {showActions ? (
        <View style={[styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Unpair Button */}
          <TouchableOpacity
            style={[
              styles.unpairBtn,
              {
                borderColor: isDark ? colors.danger.border : colors.danger.light,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : colors.danger.light,
              },
            ]}
            onPress={handleUnpairConfirm}
            activeOpacity={0.75}
          >
            <LogOut size={14} color={colors.danger.main} />
            <Text style={[styles.unpairBtnText, { color: colors.danger.main }]}>
              {t('pair.unpair')}
            </Text>
          </TouchableOpacity>

          {/* Refresh / Ping Button */}
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
            onPress={handlePing}
            disabled={pinging}
            activeOpacity={0.75}
          >
            {pinging ? (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : (
              <RefreshCw size={14} color={colors.text.secondary} />
            )}
            <Text style={[styles.refreshBtnText, { color: colors.text.secondary }]}>
              {t('pair.pingNow')}
            </Text>
          </TouchableOpacity>

          {/* Continue Button */}
          {onPressContinue ? (
            <TouchableOpacity
              style={[
                styles.continueBtn,
                {
                  backgroundColor: isOnline ? colors.primary[600] : colors.slate[500],
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={onPressContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>{t('pair.continue')}</Text>
              <ActionArrow size={14} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: {
    flex: 1,
  },
  titleBadgeRow: {
    alignItems: 'center',
    gap: 6,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  versionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Cairo',
  },
  ipPortText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  metaRow: {
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  actionRow: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  continueBtn: {
    flex: 1.4,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  refreshBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  refreshBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: 'Cairo',
  },
  unpairBtn: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  unpairBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: 'Cairo',
  },
  // Compact Styles
  compactContainer: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  compactDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  compactShopName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
    maxWidth: 130,
  },
  compactIp: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  compactRefreshBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
