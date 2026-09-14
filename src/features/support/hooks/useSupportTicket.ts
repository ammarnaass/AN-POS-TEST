import { useState } from 'react';
import type { SupportTicketForm } from '../types';

export function useSupportTicket(defaultPhone: string = '') {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketForm, setTicketForm] = useState<SupportTicketForm>({
    subject: '',
    category: 'استفسار عام',
    message: '',
    phone: defaultPhone,
  });

  const openTicketModal = () => {
    setIsTicketModalOpen(true);
    setTicketSent(false);
    if (!ticketForm.phone && defaultPhone) {
      setTicketForm((prev) => ({ ...prev, phone: defaultPhone }));
    }
  };

  const closeTicketModal = () => {
    setIsTicketModalOpen(false);
    setTicketSent(false);
  };

  const updateTicketFormField = <K extends keyof SupportTicketForm>(
    field: K,
    value: SupportTicketForm[K]
  ) => {
    setTicketForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) return;

    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      setIsTicketModalOpen(false);
      setTicketForm({
        subject: '',
        category: 'استفسار عام',
        message: '',
        phone: defaultPhone,
      });
    }, 2000);
  };

  return {
    isTicketModalOpen,
    ticketSent,
    ticketForm,
    openTicketModal,
    closeTicketModal,
    updateTicketFormField,
    handleSendTicket,
  };
}
