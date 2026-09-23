import React from 'react';
import { POSPaymentModal, type POSPaymentModalProps } from '../checkout';

export interface PaymentModalProps extends POSPaymentModalProps {}

export const PaymentModal: React.FC<PaymentModalProps> = (props) => {
  return <POSPaymentModal {...props} />;
};

export default PaymentModal;
