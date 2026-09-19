import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { usePOSNavigation } from '../usePOSNavigation';

function Probe() {
  const { goHome, goSalesHistory } = usePOSNavigation();
  const location = useLocation();
  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <button type="button" onClick={goHome}>
        خروج
      </button>
      <button type="button" onClick={goSalesHistory}>
        سجل المبيعات
      </button>
    </div>
  );
}

describe('usePOSNavigation (تنقل الخروج والسجل)', () => {
  it('زر الخروج ينقل إلى لوحة التحكم الرئيسية /', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <Probe />
      </MemoryRouter>
    );
    expect(screen.getByTestId('pathname').textContent).toBe('/pos');
    fireEvent.click(screen.getByText('خروج'));
    await waitFor(() =>
      expect(screen.getByTestId('pathname').textContent).toBe('/')
    );
  });

  it('زر سجل المبيعات ينقل إلى /sales', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <Probe />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('سجل المبيعات'));
    await waitFor(() =>
      expect(screen.getByTestId('pathname').textContent).toBe('/sales')
    );
  });
});
