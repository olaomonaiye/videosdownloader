'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SiteSettings } from '@/lib/types';

const defaultSettings: SiteSettings = {
  site_name: process.env.NEXT_PUBLIC_SITE_NAME || 'VideoDownloader',
  site_url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:7600',
  site_tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'Download Any Video, Anywhere',
  site_description: '', site_logo_light: '/images/logo.svg', site_logo_dark: '/images/logo-dark.svg',
  site_favicon: '/images/favicon.ico', site_og_image_default: '/images/og-default.png',
  footer_text: '', contact_email: '', google_analytics_id: '', clarity_project_id: '',
  social_twitter: '', social_facebook: '', social_github: '', maintenance_mode: 'false',
};

const BrandContext = createContext<SiteSettings>(defaultSettings);

export function BrandProvider({ children, initialSettings }: { children: ReactNode; initialSettings?: SiteSettings }) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings || defaultSettings);

  useEffect(() => {
    if (!initialSettings) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/settings/public`)
        .then(r => r.json())
        .then(data => { if (data.success && data.data) setSettings({ ...defaultSettings, ...data.data }); })
        .catch(() => {});
    }
  }, [initialSettings]);

  return <BrandContext.Provider value={settings}>{children}</BrandContext.Provider>;
}

export function useBrand() { return useContext(BrandContext); }
export { BrandContext };
