import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Cloud, Wifi, ChevronLeft, Loader2, AlertCircle, Globe } from 'lucide-react-native';

interface Props {
  onConnect: (serverUrl: string, key: string) => void;
  onBack: () => void;
  loading: boolean;
}

const CloudStep = ({ onConnect, onBack, loading }: Props) => {
  const [cloudUrl, setCloudUrl] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleConnect = () => {
    if (!cloudUrl.trim()) return setError('أدخل عنوان الخادم السحابي');
    if (!key.trim()) return setError('أدخل مفتاح الاتصال');
    setError('');
    onConnect(cloudUrl.trim(), key.trim());
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <ChevronLeft size={20} color="#94a3b8" />
        <Text style={styles.backText}>العودة</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Cloud size={24} color="#3b82f6" />
        </View>
        <Text style={styles.title}>الاتصال السحابي</Text>
        <Text style={styles.subtitle}>ربط الجهازين عبر الإنترنت حتى لو كانا في شبكتين مختلفتين</Text>
      </View>

      <View style={styles.diagramCard}>
        <Text style={styles.diagramText}>📱 → 🌐 → ☁️ → 🌐 → 💻</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>عنوان الخادم السحابي</Text>
        <TextInput
          style={styles.input}
          placeholder="https://cloud.anpos.app"
          value={cloudUrl}
          onChangeText={setCloudUrl}
          placeholderTextColor="#94a3b8"
          textAlign="center"
        />

        <Text style={styles.label}>مفتاح الاتصال</Text>
        <TextInput
          style={[styles.input, styles.keyInput]}
          placeholder="ABCD-1234-EFGH-5678"
          value={key}
          onChangeText={setKey}
          placeholderTextColor="#94a3b8"
          textAlign="center"
        />

        {error ? (
          <View style={styles.errorRow}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.connectBtn, (!cloudUrl || !key || loading) && styles.connectBtnDisabled]}
          onPress={handleConnect}
          disabled={!cloudUrl || !key || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Cloud size={20} color="#fff" />}
          <Text style={styles.connectText}>{loading ? 'جاري الاتصال...' : 'اتصال سحابي'}</Text>
        </TouchableOpacity>

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>الخادم السحابي يجسر الاتصال بين الأجهزة</Text>
          <Text style={styles.hintText}>البيانات مشفرة ولا تُخزّن على الخادم</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: '#94a3b8', fontSize: 14 },
  header: { alignItems: 'center', gap: 8 },
  iconContainer: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  subtitle: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  diagramCard: {
    backgroundColor: '#f0f9ff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#bae6fd'
  },
  diagramText: { color: '#0284c7', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 8 },
  label: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  input: {
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0'
  },
  keyInput: { fontFamily: 'monospace', letterSpacing: 2 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 8 },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  hintContainer: { gap: 2 },
  hintText: { fontSize: 10, color: '#94a3b8/50', textAlign: 'center' },
});

export default CloudStep;
