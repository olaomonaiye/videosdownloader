'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';

const platforms = [
  { name: 'YouTube', color: '#FF0000' },
  { name: 'Facebook', color: '#1877F2' },
  { name: 'Instagram', color: '#E4405F' },
  { name: 'TikTok', color: '' },
  { name: 'Twitter', color: '' },
  { name: '1,870+ Platforms', color: '#2563EB' },
];

export function PlatformRotator() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const rotate = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % platforms.length);
      setAnimating(false);
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(rotate, 2500);
    return () => clearInterval(interval);
  }, [rotate]);

  const current = platforms[index];
  const currentColor = current.color || (mounted && resolvedTheme === 'dark' ? '#FFFFFF' : '#000000');

  return (
    <span className="inline-flex relative overflow-hidden" style={{ minWidth: '280px', height: '1.15em', verticalAlign: 'baseline' }}>
      <span
        className="inline-block transition-all duration-300 ease-in-out font-extrabold"
        style={{
          color: currentColor,
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(-100%)' : 'translateY(0)',
        }}
      >
        {current.name}
      </span>
    </span>
  );
}
