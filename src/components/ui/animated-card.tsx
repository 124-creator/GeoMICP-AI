import * as React from 'react'
import { motion, useMotionValue, useTransform, type HTMLMotionProps } from 'framer-motion'

import { premiumSpring } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type MotionPassThrough = Pick<
  HTMLMotionProps<'div'>,
  'animate' | 'custom' | 'initial' | 'transition' | 'variants' | 'viewport' | 'whileInView'
>

type AnimatedCardVariant = 'glass' | 'solid' | 'dark'

interface AnimatedCardProps extends React.ComponentProps<typeof Card>, MotionPassThrough {
  motionClassName?: string
  hover?: boolean
  magnetic?: boolean
  variant?: AnimatedCardVariant
}

const variantClasses: Record<AnimatedCardVariant, string> = {
  glass: 'glass-card text-slate-900 dark:text-white',
  solid: 'glass-card text-slate-900 dark:text-white',
  dark: 'glass-card-dark text-white',
}

function AnimatedCard({
  className,
  motionClassName,
  children,
  hover = true,
  magnetic = false,
  variant = 'solid',
  animate,
  custom,
  initial,
  transition,
  variants,
  viewport,
  whileInView,
  ...props
}: AnimatedCardProps) {
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const rotateX = useTransform(tiltX, (value) => value + 'deg')
  const rotateY = useTransform(tiltY, (value) => value + 'deg')

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!magnetic) return

    const rect = event.currentTarget.getBoundingClientRect()
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5
    tiltX.set(relativeY * -4)
    tiltY.set(relativeX * 4)
  }

  function handleMouseLeave() {
    tiltX.set(0)
    tiltY.set(0)
  }

  return (
    <motion.div
      animate={animate}
      custom={custom}
      initial={initial}
      transition={transition ?? premiumSpring}
      variants={variants}
      viewport={viewport}
      whileHover={hover ? { scale: 1.003, boxShadow: '0 25px 50px -12px rgba(203,213,225,.5)' } : undefined}
      whileInView={whileInView}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={magnetic ? { perspective: 900, rotateX, rotateY } : undefined}
      className={cn('will-change-transform', motionClassName)}
    >
      <Card
        className={cn(
          'relative transition-shadow duration-300 motion-safe:group-hover/card:shadow-xl',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </Card>
    </motion.div>
  )
}

export { AnimatedCard }
