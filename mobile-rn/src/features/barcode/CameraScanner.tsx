import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { ScanBarcode, X } from 'lucide-react-native';
import { AnposCamera, type ScanResult, type ScanCallback } from '@/modules/AnposCamera';

interface CameraScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const CameraScanner = ({ onScan, onClose }: CameraScannerProps) => {
  const hasScanned = useRef(false);

  useEffect(() => {
    const startCamera = async () => {
      const granted = await AnposCamera.requestPermission();
      if (!granted) {
        Alert.alert('تم رفض إذن الكاميرا', 'يرجى السماح بالوصول من إعدادات الجهاز.');
        onClose();
        return;
      }

      const callback: ScanCallback = (result: ScanResult) => {
        if (!hasScanned.current) {
          hasScanned.current = true;
          onScan(result.code);
          onClose();
        }
      };

      AnposCamera.startScan(callback);
    };

    startCamera();

    return () => {
      AnposCamera.stopScan();
    };
  }, [onScan, onClose]);

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>مسح الباركود</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraArea}>
          <View style={styles.scanFrame} />
          <Text style={styles.hint}>وجه الكاميرا نحو الباركود</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', fontFamily: 'Cairo' },
  closeBtn: { padding: 8 },
  cameraArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 200,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 20,
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CameraScanner;
