import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PriceTierButtons } from '../PriceTierButtons';

describe('PriceTierButtons Component', () => {
  it('renders all 4 tiers in compact variant and fires onSelectTier', () => {
    const handleSelect = vi.fn();
    render(<PriceTierButtons activeTier="1" onSelectTier={handleSelect} variant="compact" />);

    expect(screen.getByText(/س1/)).toBeInTheDocument();
    expect(screen.getByText(/س2/)).toBeInTheDocument();
    expect(screen.getByText(/س3/)).toBeInTheDocument();
    expect(screen.getByText(/س4/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/س3/));
    expect(handleSelect).toHaveBeenCalledWith('3');
  });

  it('renders topbar variant with badges and calls onSelectTier', () => {
    const handleSelect = vi.fn();
    render(<PriceTierButtons activeTier="2" onSelectTier={handleSelect} variant="topbar" />);

    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('P3')).toBeInTheDocument();
    expect(screen.getByText('P4')).toBeInTheDocument();

    fireEvent.click(screen.getByText('P4'));
    expect(handleSelect).toHaveBeenCalledWith('4');
  });

  it('renders row variant with tierPrices and displays individual formatted prices', () => {
    const handleSelect = vi.fn();
    const prices = { p1: 150, p2: 140, p3: 130, p4: 120 };
    render(
      <PriceTierButtons
        activeTier="1"
        onSelectTier={handleSelect}
        variant="row"
        tierPrices={prices}
        formatMoney={(v) => `${v} DA`}
      />
    );

    expect(screen.getByText('150 DA')).toBeInTheDocument();
    expect(screen.getByText('140 DA')).toBeInTheDocument();
    expect(screen.getByText('130 DA')).toBeInTheDocument();
    expect(screen.getByText('120 DA')).toBeInTheDocument();

    fireEvent.click(screen.getByText('130 DA'));
    expect(handleSelect).toHaveBeenCalledWith('3');
  });

  it('renders ribbon variant for Design 7 with shortcut annotations', () => {
    const handleSelect = vi.fn();
    render(<PriceTierButtons activeTier="3" onSelectTier={handleSelect} variant="ribbon" />);

    expect(screen.getByText('Alt+1')).toBeInTheDocument();
    expect(screen.getByText('Alt+2')).toBeInTheDocument();
    expect(screen.getByText('Alt+3')).toBeInTheDocument();
    expect(screen.getByText('Alt+4')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Alt+2'));
    expect(handleSelect).toHaveBeenCalledWith('2');
  });

  it('supports cycle variant for compact headers and advances to next tier', () => {
    const handleSelect = vi.fn();
    render(<PriceTierButtons activeTier="1" onSelectTier={handleSelect} variant="cycle" />);

    const cycleBtn = screen.getByRole('button');
    fireEvent.click(cycleBtn);
    expect(handleSelect).toHaveBeenCalledWith('2');
  });
});
