import React from 'react';
import { Key } from 'lucide-react';
import { PasswordStrengthBar } from '@/utils/passwordStrength';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  onSubmit,
  newPassword,
  setNewPassword,
}: ResetPasswordModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/15">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cairo text-sm font-bold text-on-surface">إعادة تعيين كلمة المرور</h3>
            <p className="text-[11px] text-on-surface-variant">أدخل كلمة المرور الجديدة للمستخدم</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-on-surface">كلمة المرور الجديدة</label>
          <input
            type="password"
            placeholder="8 أحرف على الأقل"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
          />
          {newPassword && (
            <PasswordStrengthBar password={newPassword} showDetails={true} />
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-outline-variant/20 rounded-xl text-on-surface-variant text-xs font-bold hover:bg-surface-container transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
          >
            حفظ التغيير
          </button>
        </div>
      </div>
    </div>
  );
}
