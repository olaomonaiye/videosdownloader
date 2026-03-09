'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useBrand } from '@/providers/brand-provider';

export function Footer() {
  const brand = useBrand();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-slate-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image src={brand.site_logo_light || '/images/logo.svg'} alt={brand.site_name || ''} width={32} height={32} className="h-8 w-8 dark:hidden" />
              <Image src={brand.site_logo_dark || '/images/logo-dark.svg'} alt={brand.site_name || ''} width={32} height={32} className="h-8 w-8 hidden dark:block" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">{brand.site_name}</span>
            </Link>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              {brand.site_description || brand.site_tagline || 'Download videos from 1000+ platforms for free.'}
            </p>
          </div>
          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              {[{ href: '/services', label: 'All Platforms' }, { href: '/sitemaps', label: 'Site Directory' }, { href: '/sitemaps', label: 'Sitemaps' }, { href: '/blog', label: 'Blogs' }].map(l => (
                <li key={l.label}><Link href={l.href} className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Company</h3>
            <ul className="mt-4 space-y-2">
              {[{ href: '/pages/about', label: 'About Us' }, { href: '/pages/advertise', label: 'Advertise With Us' }, { href: '/pages/contact', label: 'Contact Us' }, { href: '/pages/faq', label: 'FAQ' }].map(l => (
                <li key={l.href}><Link href={l.href} className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Legal</h3>
            <ul className="mt-4 space-y-2">
              {[{ href: '/pages/terms', label: 'Terms of Service' }, { href: '/pages/privacy', label: 'Privacy Policy' }, { href: '/pages/disclaimer', label: 'Disclaimer' }, { href: '/pages/dmca', label: 'DMCA' }].map(l => (
                <li key={l.href}><Link href={l.href} className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-slate-400 dark:text-slate-500">
            {brand.footer_text || `© ${year} ${brand.site_name}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
