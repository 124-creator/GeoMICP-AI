import type { Transition, Variants } from 'framer-motion'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function transitionOrInstant(transition: Transition): Transition {
  if (prefersReducedMotion()) return { duration: 0 }
  return transition
}

export const premiumSpring: Transition = {
  type: 'spring',
  duration: 0.5,
  bounce: 0.15,
}

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitionOrInstant(premiumSpring) },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: transitionOrInstant(premiumSpring) },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      ...transitionOrInstant(premiumSpring),
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transitionOrInstant(premiumSpring) },
}

export const numberCounter: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transitionOrInstant(premiumSpring) },
}
