/**
 * AN POS Mobile — Root App Component
 * React Native 0.87 + React Navigation 7 + Nitro Modules
 * Complete Desktop Feature Parity + Light & Dark Mode System
 */
import React, { useEffect } from 'react';
import { I18nManager, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useThemeStore } from '@/store/themeStore';

// Core Screens
import PairScreen from '@/features/pair/PairScreen';
import LoginScreen from '@/features/auth/LoginScreen';
import HomeTabs from '@/components/HomeTabs';

// Sales & Invoices
import SalesScreen from '@/features/sales/SalesScreen';
import InvoiceDetailScreen from '@/features/sales/InvoiceDetailScreen';
import { CustomersScreen } from '@/features/customers/CustomersScreen';

// Suppliers & Purchases
import SuppliersScreen from '@/features/suppliers/SuppliersScreen';
import PurchaseFormScreen from '@/features/suppliers/PurchaseFormScreen';
import SupplierDetailScreen from '@/features/suppliers/SupplierDetailScreen';

// Cash & Expenses
import CashScreen from '@/features/cash/CashScreen';
import ExpensesScreen from '@/features/expenses/ExpensesScreen';

// Inventory, Products & Categories
import ProductFormScreen from '@/features/inventory/ProductFormScreen';
import CategoriesScreen from '@/features/categories/CategoriesScreen';
import PromotionsScreen from '@/features/promotions/PromotionsScreen';
import PacksScreen from '@/features/promotions/PacksScreen';

// Delivery Orders & Advanced Reports
import DeliveryOrdersScreen from '@/features/orders/DeliveryOrdersScreen';
import ProfitCenterScreen from '@/features/dashboard/ProfitCenterScreen';
import ZakatCalculatorScreen from '@/features/dashboard/ZakatCalculatorScreen';

// Printing, Templates, Barcode, Users & Backup
import PrinterSettingsScreen from '@/features/print/PrinterSettingsScreen';
import PrintTemplatesScreen from '@/features/print/PrintTemplatesScreen';
import TemplateEditorScreen from '@/features/print/TemplateEditorScreen';
import BarcodeLabelsScreen from '@/features/barcode/BarcodeLabelsScreen';
import UsersScreen from '@/features/settings/UsersScreen';
import BackupRestoreScreen from '@/features/settings/BackupRestoreScreen';

// Force RTL for Arabic UI
I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

const Stack = createNativeStackNavigator();
const GestureRoot = GestureHandlerRootView as React.ComponentType<any>;

export default function App() {
  const { isDark, colors, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, []);

  // Custom Navigation Theme
  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary[500],
          background: colors.background,
          card: colors.surface,
          text: colors.text.primary,
          border: colors.border.default,
          notification: colors.primary[500],
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary[600],
          background: colors.background,
          card: colors.surface,
          text: colors.text.primary,
          border: colors.border.default,
          notification: colors.primary[600],
        },
      };

  return (
    <GestureRoot style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.surface}
          translucent={false}
        />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            initialRouteName="Pair"
            screenOptions={{
              animation: 'slide_from_right',
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            {/* Pair / Onboarding */}
            <Stack.Screen name="Pair" component={PairScreen} />

            {/* Auth */}
            <Stack.Screen name="Login" component={LoginScreen} />

            {/* Main app — bottom tabs */}
            <Stack.Screen name="Home" component={HomeTabs} />

            {/* Sales & Invoices */}
            <Stack.Screen name="Sales" component={SalesScreen} />
            <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
            <Stack.Screen name="Customers" component={CustomersScreen} />

            {/* Suppliers & Purchases */}
            <Stack.Screen name="Suppliers" component={SuppliersScreen} />
            <Stack.Screen name="PurchaseForm" component={PurchaseFormScreen} />
            <Stack.Screen name="SupplierDetail" component={SupplierDetailScreen} />

            {/* Cash & Expenses */}
            <Stack.Screen name="Cash" component={CashScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />

            {/* Inventory, Products & Categories */}
            <Stack.Screen name="ProductForm" component={ProductFormScreen} />
            <Stack.Screen name="Categories" component={CategoriesScreen} />
            <Stack.Screen name="Promotions" component={PromotionsScreen} />
            <Stack.Screen name="Packs" component={PacksScreen} />

            {/* Delivery Orders & Financial Reports */}
            <Stack.Screen name="DeliveryOrders" component={DeliveryOrdersScreen} />
            <Stack.Screen name="ProfitCenter" component={ProfitCenterScreen} />
            <Stack.Screen name="ZakatCalculator" component={ZakatCalculatorScreen} />

            {/* Printing, Templates, Barcode, Users & Backup */}
            <Stack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
            <Stack.Screen name="PrintTemplates" component={PrintTemplatesScreen} />
            <Stack.Screen name="TemplateEditor" component={TemplateEditorScreen} />
            <Stack.Screen name="BarcodeLabels" component={BarcodeLabelsScreen} />
            <Stack.Screen name="Users" component={UsersScreen} />
            <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureRoot>
  );
}
