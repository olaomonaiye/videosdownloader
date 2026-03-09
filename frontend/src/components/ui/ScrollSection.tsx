'use client';
import { ReactNode } from 'react';
import { useScrollAnimate } from '@/hooks/use-scroll-animate';

export function ScrollSection({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useScrollAnimate<HTMLElement>();
  return (
    <section ref={ref} className={`scroll-animate ${className || ''}`}>
      {children}
    </section>
  );
}
