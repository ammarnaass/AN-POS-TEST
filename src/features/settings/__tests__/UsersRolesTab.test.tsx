// src/features/settings/__tests__/UsersRolesTab.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersRolesTab from '../tabs/UsersRolesTab';

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'admin-1', username: 'admin', name: 'المدير العام', role: 'admin' },
  }),
}));

vi.mock('../hooks/useSystemSettings', () => ({
  useSystemSettings: () => ({
    settings: { syncMode: 'local' },
    handleSaveSettings: vi.fn(),
  }),
}));

vi.mock('../infrastructure/repositories/roleRepo', () => ({
  roleRepo: {
    all: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UsersRolesTab — التحقق من سلامة الواجهة وعدم وجود أخطاء runtime', () => {
  it('renders without throwing ReferenceError: users is not defined', () => {
    expect(() => {
      renderWithClient(<UsersRolesTab />);
    }).not.toThrow();

    // Verify main header exists
    expect(screen.getByText('إدارة المستخدمين والأمان')).toBeDefined();
    // Verify tab button exists
    expect(screen.getByText('المستخدمون')).toBeDefined();
  });

  it('renders correctly with custom users and roles props', () => {
    const mockUsers = [
      { id: 'u1', username: 'seller1', name: 'البائع أحمد', role: 'seller', status: 'active' },
      { id: 'u2', username: 'seller2', name: 'البائع سارة', role: 'seller', status: 'active' },
    ];

    renderWithClient(<UsersRolesTab users={mockUsers} />);

    expect(screen.getByText('2 مستخدم')).toBeDefined();
  });
});
