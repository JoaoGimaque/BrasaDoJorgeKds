import {
  canTransitionOrderStage,
  getNextOrderStage,
} from '../src/constants/orderLifecycle';

describe('order lifecycle', () => {
  it('allows the documented forward progression', () => {
    expect(canTransitionOrderStage('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionOrderStage('CONFIRMED', 'PREPARING')).toBe(true);
    expect(canTransitionOrderStage('PREPARING', 'READY')).toBe(true);
    expect(canTransitionOrderStage('READY', 'DONE')).toBe(true);
  });

  it('rejects skipped and backward stages', () => {
    expect(canTransitionOrderStage('PENDING', 'PREPARING')).toBe(false);
    expect(canTransitionOrderStage('READY', 'PREPARING')).toBe(false);
  });

  it('allows cancellation from active stages only', () => {
    expect(canTransitionOrderStage('PENDING', 'CANCELED')).toBe(true);
    expect(canTransitionOrderStage('PREPARING', 'CANCELED')).toBe(true);
    expect(canTransitionOrderStage('DONE', 'CANCELED')).toBe(false);
  });

  it('exposes the next kitchen action without offering cancellation', () => {
    expect(getNextOrderStage('PENDING')).toBe('CONFIRMED');
    expect(getNextOrderStage('READY')).toBe('DONE');
    expect(getNextOrderStage('DONE')).toBeUndefined();
    expect(getNextOrderStage('CANCELED')).toBeUndefined();
  });
});