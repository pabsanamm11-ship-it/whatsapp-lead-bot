'use client'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useInView } from 'react-intersection-observer'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color?: string
  suffix?: string
}

export default function StatCard({ label, value, icon, color, suffix }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0)
  const { ref, inView } = useInView({ triggerOnce: true })
  const animating = useRef(false)

  useEffect(() => {
    if (!inView || animating.current) return
    animating.current = true
    const target = value ?? 0
    if (target === 0) { setDisplayed(0); return }
    const duration = 600
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setDisplayed(Math.round(progress * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return (
    <div ref={ref} className="bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color ?? 'bg-primary/10 text-primary')}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-display font-bold tracking-tight">
        {displayed}{suffix ?? ''}
      </p>
    </div>
  )
}
