import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { AppImages } from '@/assets';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  MoreHorizontal,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react-native';
import DashboardScreen from '@/features/dashboard/DashboardScreen';
import POSScreen from '@/features/pos/PoSScreen';
import InventoryScreen from '@/features/inventory/InventoryScreen';
import { SalesScreen } from '@/features/sales/SalesScreen';
import { CustomersScreen } from '@/features/customers/CustomersScreen';
import MoreScreen from '@/features/more/MoreScreen';
import SyncIndicator from '@/components/SyncIndicator';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Badge } from '@/components/ui';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused, colors }: { name: string; focused: boolean; colors: any }) => {
  const IconMap: Record<string, any> = {
    Dashboard: LayoutDashboard,
    POS: ShoppingCart,
    Inventory: Package,
    Sales: Receipt,
    Customers: Users,
    More: MoreHorizontal,
  };
  const Icon = IconMap[name] || MoreHorizontal;
  return (
    <View
      style={[
        styles.tabIconContainer,
        focused && { backgroundColor: colors.primary[50] },
      ]}
    >
      <Icon
        size={21}
        color={focused ? colors.primary[600] : colors.slate[400]}
        strokeWidth={focused ? 2.4 : 1.8}
      />
    </View>
  );
};

const TabLabel = ({ name, focused, colors }: { name: string; focused: boolean; colors: any }) => {
  const { t } = useI18n();
  const labelKeys: Record<string, any> = {
    Dashboard: 'nav.dashboard',
    POS: 'nav.pos',
    Inventory: 'nav.inventory',
    Sales: 'nav.sales',
    Customers: 'nav.customers',
    More: 'nav.more',
  };
  const labelKey = labelKeys[name];
  const translated = labelKey ? t(labelKey) : name;

  return (
    <Text
      style={[
        styles.tabLabel,
        {
          color: focused ? colors.primary[600] : colors.slate[400],
          fontWeight: focused ? '800' : '600',
        },
      ]}
    >
      {translated}
    </Text>
  );
};

export const HomeTabs = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const { isDark, colors, toggleTheme } = useTheme();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  const roleLabel =
    user?.role === 'admin'
      ? t('auth.admin')
      : user?.role === 'cashier'
      ? t('auth.cashier')
      : t('auth.seller');

  return (
    <>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Image
            source={AppImages.logo64}
            style={styles.logoSmall}
            resizeMode="contain"
          />
          <View style={styles.brandingText}>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>AN POS</Text>
              {user ? (
                <Badge
                  variant={user.role === 'admin' ? 'primary' : 'neutral'}
                  size="xs"
                  dot
                  style={styles.roleBadge}
                >
                  {roleLabel}
                </Badge>
              ) : null}
            </View>
            {user?.name ? (
              <Text
                style={[styles.headerSubtitle, { color: colors.text.secondary }]}
                numberOfLines={1}
              >
                {user.name}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.headerRight}>
          <SyncIndicator />
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
                borderColor: colors.border.default,
              },
            ]}
            activeOpacity={0.7}
          >
            {isDark ? (
              <Sun size={17} color={colors.warning.main} />
            ) : (
              <Moon size={17} color={colors.slate[600]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            style={[
              styles.iconBtn,
              styles.logoutBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : colors.danger.light,
                borderColor: colors.danger.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <LogOut size={17} color={colors.danger.main} />
          </TouchableOpacity>
        </View>
      </View>

      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} colors={colors} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel name={route.name} focused={focused} colors={colors} />
          ),
          tabBarActiveTintColor: colors.primary[600],
          tabBarInactiveTintColor: colors.slate[400],
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border.default,
            },
          ],
          headerShown: false,
          tabBarItemStyle: styles.tabBarItem,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="POS" component={POSScreen} />
        <Tab.Screen name="Inventory" component={InventoryScreen} />
        <Tab.Screen name="Sales" component={SalesScreen} />
        <Tab.Screen name="Customers" component={CustomersScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    ...shadows.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  logoSmall: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
  },
  brandingText: {
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  roleBadge: {
    marginLeft: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Cairo',
    marginTop: -2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  logoutBtn: {},

  tabBar: {
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 6,
    paddingTop: 4,
    ...shadows.sm,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabIconContainer: {
    width: 38,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  tabLabel: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
});

export default HomeTabs;
