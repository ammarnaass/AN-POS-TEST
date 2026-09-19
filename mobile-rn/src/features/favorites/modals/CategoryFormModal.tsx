import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '@/theme';
import type { FavoriteCategory } from '../types';
import {
  FAVORITE_COLORS,
  FAVORITE_ICONS_MAP,
  AVAILABLE_ICON_NAMES,
} from '../constants/favoriteVisuals';

interface CategoryFormModalProps {
  visible: boolean;
  editingCategory?: FavoriteCategory | null;
  onClose: () => void;
  onSave: (data: { name: string; icon?: string; color?: string }) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  visible,
  editingCategory,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Star');
  const [selectedColor, setSelectedColor] = useState(FAVORITE_COLORS[0]);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name || '');
      setSelectedIcon(editingCategory.icon || 'Star');
      setSelectedColor(editingCategory.color || FAVORITE_COLORS[0]);
    } else {
      setName('');
      setSelectedIcon('Star');
      setSelectedColor(FAVORITE_COLORS[0]);
    }
  }, [editingCategory, visible]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم التصنيف أولاً');
      return;
    }
    onSave({
      name: trimmed,
      icon: selectedIcon,
      color: selectedColor,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.border.default : '#e2e8f0',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {editingCategory ? 'تعديل تصنيف المفضلة' : 'تصنيف مفضلة جديد'}
            </Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* حقل اسم التصنيف */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                اسم التصنيف:
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                    borderColor: isDark ? colors.border.default : '#cbd5e1',
                    color: colors.text.primary,
                  },
                ]}
                placeholder="مثال: مشروبات طاقة، حلويات، عصائر..."
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
                textAlign="right"
              />
            </View>

            {/* اختيار اللون */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                لون التصنيف:
              </Text>
              <View style={styles.colorsGrid}>
                {FAVORITE_COLORS.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorCircle, { backgroundColor: c }]}
                      onPress={() => setSelectedColor(c)}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Check size={16} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* اختيار الأيقونة */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                أيقونة التصنيف:
              </Text>
              <View style={styles.iconsGrid}>
                {AVAILABLE_ICON_NAMES.map((iconName) => {
                  const IconComp = FAVORITE_ICONS_MAP[iconName];
                  const isSelected = selectedIcon === iconName;
                  return (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconOption,
                        {
                          backgroundColor: isSelected
                            ? selectedColor
                            : isDark
                            ? '#1e293b'
                            : '#f1f5f9',
                          borderColor: isSelected
                            ? selectedColor
                            : isDark
                            ? colors.border.default
                            : '#e2e8f0',
                        },
                      ]}
                      onPress={() => setSelectedIcon(iconName)}
                      activeOpacity={0.8}
                    >
                      <IconComp
                        size={20}
                        color={isSelected ? '#ffffff' : colors.text.primary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { borderTopColor: isDark ? colors.border.default : '#f1f5f9' },
            ]}
          >
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text.secondary }]}>
                إلغاء
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary[500] }]}
              onPress={handleSubmit}
            >
              <Check size={18} color="#ffffff" />
              <Text style={styles.saveBtnText}>
                {editingCategory ? 'حفظ التعديلات' : 'إنشاء التصنيف'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
