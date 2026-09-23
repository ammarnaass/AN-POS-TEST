import React from 'react';
import type { Customer } from '@/types';
import { POSCustomerSelectModal, POSCustomerSelectModalProps } from '../debt';

export interface CustomerSelectModalProps extends POSCustomerSelectModalProps {}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = (props) => {
  return <POSCustomerSelectModal {...props} />;
};

export default CustomerSelectModal;
