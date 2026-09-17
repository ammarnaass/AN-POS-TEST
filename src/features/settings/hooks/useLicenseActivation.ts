import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { fetchLicenseStatus, activateLicenseWithKey, deactivateCurrentLicense, type LicenseStatus } from '@/services/licenseService';
import { clearTrial, getTrialState } from '@/services/trialService';

export function useLicenseActivation() {
  const { user: currentUser } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [activationInput, setActivationInput] = useState('');
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const isDeveloper = currentUser?.role === 'developer';
  const trial = getTrialState(currentUser?.role);
  const isLicenseActive = Boolean(licenseStatus?.isLicensed && licenseStatus?.status === 'active');
  const isExpiredAndLocked = !isDeveloper && !isLicenseActive && trial.isExpired;

  useEffect(() => {
    fetchLicenseStatus().then(setLicenseStatus);
  }, []);

  const handleActivate = async () => {
    if (!activationInput.trim()) {
      addNotification({ title: 'تنبيه', message: 'يرجى إدخال كود التفعيل أولاً', type: 'warning' });
      return;
    }
    setIsActivating(true);
    try {
      const result = await activateLicenseWithKey(activationInput);
      if (!result.success || !result.status) {
        addNotification({ title: 'فشل التفعيل', message: result.error ?? 'كود التفعيل غير صالح', type: 'error' });
        return;
      }
      clearTrial();
      setLicenseStatus(result.status);
      setActivationInput('');
      addNotification({ title: 'تم التفعيل بنجاح', message: 'تم تفعيل ترخيص AN POS لهذا الجهاز بنجاح', type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'خطأ', message: err?.message || 'تعذر إتمام عملية التفعيل', type: 'error' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setActivationInput(content);
        setIsActivating(true);
        const result = await activateLicenseWithKey(content);
        setIsActivating(false);
        if (result.success && result.status) {
          clearTrial();
          setLicenseStatus(result.status);
          setActivationInput('');
          addNotification({ title: 'تم التفعيل', message: 'تم استيراد وتفعيل ملف الترخيص بنجاح', type: 'success' });
        } else {
          addNotification({ title: 'فشل التفعيل', message: result.error || 'ملف الترخيص غير صالح', type: 'error' });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeactivate = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إلغاء تفعيل هذا الجهاز؟ سيعود النظام للوضع التجريبي.')) {
      await deactivateCurrentLicense();
      const st = await fetchLicenseStatus();
      setLicenseStatus(st);
      addNotification({ title: 'تم إلغاء التفعيل', message: 'تمت إزالة الترخيص من هذا الجهاز', type: 'info' });
    }
  };

  const handleCopyFingerprint = () => {
    if (licenseStatus?.hardwareFingerprint) {
      navigator.clipboard.writeText(licenseStatus.hardwareFingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
      addNotification({ title: 'تم النسخ', message: 'تم نسخ بصمة الجهاز للحافظة', type: 'success' });
    }
  };

  return {
    licenseStatus,
    activationInput,
    setActivationInput,
    copiedFingerprint,
    isActivating,
    isDeveloper,
    trial,
    isLicenseActive,
    isExpiredAndLocked,
    handleActivate,
    handleFileUpload,
    handleDeactivate,
    handleCopyFingerprint,
    addNotification,
  };
}
