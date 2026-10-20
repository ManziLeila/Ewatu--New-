/** Shared motion presets — keep under ~200ms for product feel */
export const motionTransition = {
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1] as const,
};

export const pageMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: motionTransition,
};
