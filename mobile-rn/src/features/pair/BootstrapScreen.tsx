import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { AppImages } from '@/assets';
import { db as unifiedDB, getStoredMode } from '@/infrastructure/database/UnifiedDB';
import { session, checkServerHealth } from '@/lib/apiClient';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { getPairedDevice, savePairedDevice, type PairedDevice } from '@/lib/pairedDeviceStore';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/db';

interface Props {
  navigation: any;
}

export default function BootstrapScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigatedRef = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const safeNavigate = (routeName: string, params?: any) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigation.replace(routeName, params);
    };

    // 4-second maximum safety timeout
    const timeout = setTimeout(() => {
      console.warn('[BootstrapScreen] ⏱️ Timeout reached, defaulting to ModeSelect');
      safeNavigate('ModeSelect');
    }, 4000);

    const bootstrap = async () => {
      try {
        // 1. Initialize local SQLite and unified DB layer
        await unifiedDB.init();

        // 2. Check connection / session status
        const connected = await session.isConnected();

        if (connected) {
          // Check if PairedDevice model is saved, or auto-migrate from existing keys
          let paired = await getPairedDevice();
          if (!paired) {
            const serverUrl = await session.getServerUrl();
            if (serverUrl) {
              const devId = (await AnposSecureStore.get(STORAGE_KEYS.DEVICE_ID)) || 'migrated-device';
              let ip = '127.0.0.1';
              let port = 4321;
              try {
                const u = new URL(serverUrl);
                ip = u.hostname;
                port = Number(u.port) || 4321;
              } catch {}

              const health = await checkServerHealth(serverUrl).catch(() => ({ ok: false, info: null }));
              paired = {
                deviceId: devId,
                serverUrl,
                ip,
                port,
                shopName: health.info?.shopName || 'AN POS',
                deviceName: health.info?.deviceName || `AN POS (${ip})`,
                version: health.info?.version || '1.0.0',
                mode: serverUrl.includes('cloud') ? 'cloud' : 'lan',
                pairedAt: new Date().toISOString(),
                lastSeenAt: new Date().toISOString(),
                lastStatus: health.ok ? 'online' : 'offline',
              };
              await savePairedDevice(paired);
            }
          }

          // Check if user session exists to restore
          const userId = await AnposSecureStore.get(STORAGE_KEYS.USER_ID);
          if (userId) {
            const restored = await useAuthStore.getState().restoreSession();
            clearTimeout(timeout);
            if (restored) {
              safeNavigate('Home');
            } else {
              safeNavigate('Login');
            }
            return;
          }

          clearTimeout(timeout);
          safeNavigate('Login');
          return;
        }

        // Not connected mode: check if stored mode is standalone
        const mode = await getStoredMode();
        if (mode === 'standalone') {
          // Check if standalone local users exist
          const totalUsers = await db.users.count().catch(() => 0);
          clearTimeout(timeout);
          if (totalUsers > 0) {
            safeNavigate('Login');
          } else {
            safeNavigate('ModeSelect');
          }
          return;
        }

        clearTimeout(timeout);
        safeNavigate('ModeSelect');
      } catch (err) {
        console.warn('[BootstrapScreen] Bootstrap error:', err);
        clearTimeout(timeout);
        safeNavigate('ModeSelect');
      }
    };

    bootstrap();

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.centerBox, { opacity: fadeAnim }]}>
        <View style={styles.logoBox}>
          <Image source={AppImages.logo} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={[styles.brandTitle, { color: colors.text.primary }]}>AN POS</Text>
        <Text style={[styles.brandSubtitle, { color: colors.text.secondary }]}>
          {t('modeSelect.welcomeTitle') || 'نظام إدارة المبيعات ونقاط البيع'}
        </Text>
        <ActivityIndicator
          size="small"
          color={colors.primary[600]}
          style={styles.spinner}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoBox: {
    width: 90,
    height: 90,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 80,
    height: 80,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Cairo',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});
