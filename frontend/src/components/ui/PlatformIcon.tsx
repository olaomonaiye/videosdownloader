'use client';

import { useState } from 'react';

interface PlatformIconProps {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

const BRAND_COLORS: Record<string, string> = {
  youtube: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  facebook: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  instagram: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  tiktok: 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-white',
  twitter: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  vimeo: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  reddit: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  twitch: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  soundcloud: 'bg-orange-100 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400',
  spotify: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  dailymotion: 'bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400',
  pinterest: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
  linkedin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  snapchat: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function getBrandColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(BRAND_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400';
}

export function PlatformIcon({ name, logoUrl, size = 'md', className = '' }: PlatformIconProps) {
  const sizeClass = SIZES[size];
  const [imgError, setImgError] = useState(false);
  const brandColor = getBrandColor(name);

  if (logoUrl && !imgError) {
    return (
      <div className={`${sizeClass} rounded-lg shrink-0 overflow-hidden ring-1 ring-slate-200 dark:ring-zinc-700 bg-white p-1 ${className}`}>
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-lg ${brandColor} flex items-center justify-center font-bold shrink-0 ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
