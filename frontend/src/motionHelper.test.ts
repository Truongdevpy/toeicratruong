// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MOTION_CONFIG,
  isReducedMotionPreferred,
  isMotionEnabled,
  triggerGentleConfetti,
  animateCountUp,
  MotionMode,
} from './utils/motionHelper';

describe('Motion Helper & Tokens', () => {
  it('defines standard motion durations and curves', () => {
    expect(MOTION_CONFIG.duration.fast).toBe(120);
    expect(MOTION_CONFIG.duration.base).toBe(200);
    expect(MOTION_CONFIG.duration.slow).toBe(320);
    expect(MOTION_CONFIG.easing.out).toContain('cubic-bezier');
  });

  it('correctly detects reduced motion mode', () => {
    expect(isReducedMotionPreferred('reduced')).toBe(true);
    expect(isReducedMotionPreferred('off')).toBe(true);
    expect(isReducedMotionPreferred('full')).toBe(false);
  });

  it('correctly determines whether motion is enabled', () => {
    expect(isMotionEnabled('full')).toBe(true);
    expect(isMotionEnabled('reduced')).toBe(true);
    expect(isMotionEnabled('off')).toBe(false);
  });

  it('runs animateCountUp immediately to target when motion is reduced or off', () => {
    let val = 0;
    animateCountUp(100, (v) => { val = v; }, 400, 'reduced');
    expect(val).toBe(100);

    let val2 = 0;
    animateCountUp(50, (v) => { val2 = v; }, 400, 'off');
    expect(val2).toBe(50);
  });

  it('skips confetti when motion is reduced or off', async () => {
    document.documentElement.setAttribute('data-motion', 'reduced');
    await expect(triggerGentleConfetti()).resolves.toBeUndefined();
  });
});
