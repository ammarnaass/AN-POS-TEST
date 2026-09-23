import React from 'react';
import { POSQuickCustomerModal, POSQuickCustomerModalProps } from '../debt';

export interface QuickCustomerModalProps extends POSQuickCustomerModalProps {}

export const QuickCustomerModal: React.FC<QuickCustomerModalProps> = (props) => {
  return <POSQuickCustomerModal {...props} />;
};

export default QuickCustomerModal;
