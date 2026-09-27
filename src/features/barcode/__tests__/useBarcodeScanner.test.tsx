import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBarcodeScanner } from '../useBarcodeScanner';

describe('useBarcodeScanner - Fast Burst and Terminator Clearing', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('triggers onScan, resets input value via native setter and dispatches pos:clear_barcode_input on rapid barcode scan', () => {
    const onScan = vi.fn();
    const clearEventListener = vi.fn();
    window.addEventListener('pos:clear_barcode_input', clearEventListener);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.value = '613000123456';

    renderHook(
      () =>
        useBarcodeScanner({
          onScan,
          enabled: true,
          respectInputFocus: false,
        }),
      { wrapper }
    );

    // Simulate fast burst scanning (< 50ms per key)
    const barcode = '613000123456';
    let mockTime = 1000;
    vi.setSystemTime(mockTime);

    for (const char of barcode) {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: char,
          bubbles: true,
          cancelable: true,
        })
      );
      mockTime += 10;
      vi.setSystemTime(mockTime);
    }

    // Now send the Enter terminator
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
    );

    expect(onScan).toHaveBeenCalledWith('613000123456');
    expect(input.value).toBe('');
    expect(clearEventListener).toHaveBeenCalledTimes(1);
    expect(clearEventListener.mock.calls[0][0].detail).toEqual({
      code: '613000123456',
    });

    window.removeEventListener('pos:clear_barcode_input', clearEventListener);
  });
});
