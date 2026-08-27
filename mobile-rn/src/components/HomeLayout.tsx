import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AppImages } from '@/assets';
import { Home, ShoppingCart, Package, Users, MoreHorizontal, Sun, Moon, LogOut } from 'lucide-react-native';
import DashboardScreen from '@/features/dashboard/DashboardScreen';
import POSScreen from '@/features/pos/PoSScreen';
import InventoryScreen from '@/features/inventory/InventoryScreen';
import { CustomersScreen } from '@/features/customers/CustomersScreen';
import MoreScreen from '@/features/more/MoreScreen';
import SyncIndicator from '@/components/SyncIndicator';
import { useAuthStore } from '@/store/authStore';

const Tab = createBottomTabNavigator();

type TabName = 'Dashboard' | 'POS' | 'Inventory' | 'Customers' | 'More';

const TabIcon = ({ name, focused, size }: { name: TabName; focused: boolean; size: number }) => {
  const IconMap = {
    Dashboard: Home, POS: ShoppingCart, Inventory: Package,
    Customers: Users, More: MoreHorizontal,
  };
  const Icon = IconMap[name] || MoreHorizontal;
  return <Icon size={size} color={focused ? '#3b82f6' : '#94a3b8'} />;
};

const HomeLayout = ({ navigation }: any) => {
  const { user, logout, serverUrl } = useAuthStore();
  const [darkMode, setDarkMode] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={AppImages.logo64} style={styles.logoSmall} resizeMode="contain" />
          <View>
            <Text style={styles.headerTitle}>AN POS</Text>
            {user ? (
              <Text style={styles.headerSubtitle}>
                {user.name} • {user.role === 'admin' ? 'مدير' : user.role === 'cashier' ? 'كاشير' : 'بائع'}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          <SyncIndicator />
          <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={styles.iconBtn}>
            {darkMode ? <Sun size={20} color="#94a3b8" /> : <Moon size={20} color="#94a3b8" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Tab.Navigator
        screenListeners={{
          tabPress: () => { /* could add analytics */ },
        }}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name as TabName} focused={focused} size={24} />
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, { color: focused ? '#3b82f6' : '#94a3b8' }]}>
              {route.name === 'Dashboard' ? 'الرئيسية' :
               route.name === 'POS' ? 'البيع' :
               route.name === 'Inventory' ? 'المخزون' :
               route.name === 'Customers' ? 'الزبائن' : 'المزيد'}
            </Text>
          ),
          tabBarLabelPosition: 'beside-icon',
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: styles.tabBar,
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="POS" component={POSScreen} />
        <Tab.Screen name="Inventory" component={InventoryScreen} />
        <Tab.Screen name="Customers" component={CustomersScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoSmall: {
    width: 36,
    height: 36,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  headerSubtitle: { fontSize: 11, color: '#94a3b8' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#f8fafc', borderTopColor: '#e2e8f0',
    height: 60, paddingBottom: 6,
  },
  tabLabel: { fontSize: 10, fontFamily: 'Cairo', marginTop: 2 },
});

export default HomeLayout;
