import React from 'react';
import { POSSaleSuccessModal, type POSSaleSuccessModalProps } from '../checkout';

export interface SuccessModalProps extends POSSaleSuccessModalProps {}

export const SuccessModal: React.FC<SuccessModalProps> = (props) => {
  return <POSSaleSuccessModal {...props} />;
};

export default SuccessModal;
