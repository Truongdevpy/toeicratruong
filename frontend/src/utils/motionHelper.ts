/**
 * Motion Helpers & Token Definitions for TOEIC Ra Trường
 * Centralized motion utilities respecting user preferences, battery, and low-power devices.
 */

export type MotionMode = 'full' | 'reduced' | 'off';

export interface MotionConfig {
  duration: {
    instant: number;
    fast: number;
    base: number;
    slow: number;
    celebrate: number;
  };
  easing: {
    out: string;
    in: string;
    inOut: string;
    spring: string;
    bounce: string;
  };
}

export const MOTION_CONFIG: MotionConfig = {
  duration: {
    instant: 0,
    fast: 120,
    base: 200,
    slow: 320,
    celebrate: 1200,
  },
  easing: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

/**
 * Checks if reduced motion is requested either via user settings or OS preference.
 */
export function isReducedMotionPreferred(userMode: MotionMode = 'full'): boolean {
  if (userMode === 'off' || userMode === 'reduced') return true;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Checks if animations should run at all.
 */
export function isMotionEnabled(userMode: MotionMode = 'full'): boolean {
  if (userMode === 'off') return false;
  return true;
}

/**
 * Detects low-end devices or battery saving conditions (e.g. navigator.hardwareConcurrency <= 4).
 */
export function isLowPowerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as any;
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) {
    return true;
  }
  if (nav.deviceMemory && nav.deviceMemory <= 2) {
    return true;
  }
  return false;
}

/**
 * Trigger lightweight confetti only when motion is full and not in reduced/off mode.
 * Safe fallback: returns immediately without error.
 */
export async function triggerGentleConfetti(options: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
} = {}) {
  if (typeof window === 'undefined') return;
  const motionMode = (document.documentElement.getAttribute('data-motion') as MotionMode) || 'full';
  if (isReducedMotionPreferred(motionMode)) {
    return;
  }

  try {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default || confettiModule;
    confetti({
      particleCount: Math.min(options.particleCount || 40, 60),
      spread: options.spread || 50,
      origin: options.origin || { y: 0.6 },
      disableForReducedMotion: true,
      ticks: 120, // Short burst under 2 seconds
    });
  } catch (err) {
    console.debug('Confetti skip:', err);
  }
}

/**
 * Animate numbers counting up smoothly using requestAnimationFrame.
 */
export function animateCountUp(
  targetValue: number,
  onUpdate: (value: number) => void,
  durationMs: number = 400,
  motionMode: MotionMode = 'full'
) {
  if (isReducedMotionPreferred(motionMode) || durationMs <= 0) {
    onUpdate(targetValue);
    return;
  }

  const startValue = 0;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    // Smooth easeOutQuad
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const current = Math.round(startValue + (targetValue - startValue) * easeProgress);
    onUpdate(current);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onUpdate(targetValue);
    }
  }

  requestAnimationFrame(step);
}
