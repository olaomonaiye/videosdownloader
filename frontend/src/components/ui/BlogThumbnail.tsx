'use client';

import { useState } from 'react';

const FALLBACK = '/images/og-default.svg';

interface BlogThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function BlogThumbnail({ src, alt, className = '' }: BlogThumbnailProps) {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(FALLBACK)}
      loading="lazy"
    />
  );
}
