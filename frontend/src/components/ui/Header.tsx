'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, X, Sun, Moon, Search } from 'lucide-react';
import { useBrand } from '@/providers/brand-provider';
import { cn } from '@/lib/utils';

interface PlatformItem {
  name: string;
  slug: string;
}

export function Header() {
  const brand = useBrand();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [allPlatforms, setAllPlatforms] = useState<PlatformItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch all platforms once for instant search
    const fetchPlatforms = async () => {
      try {
        let all: PlatformItem[] = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7500'}/api/v1/platforms?pageSize=500&page=${page}`);
          const data = await resp.json();
          if (data.data) {
            all = [...all, ...data.data.map((p: any) => ({ name: p.name, slug: p.slug }))];
          }
          hasMore = data.meta && page < data.meta.totalPages;
          page++;
        }
        setAllPlatforms(all);
      } catch {}
    };
    fetchPlatforms();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredPlatforms = searchQuery.length >= 1
    ? allPlatforms
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
          // Exact start matches first
          const aStarts = a.name.toLowerCase().startsWith(searchQuery.toLowerCase()) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(searchQuery.toLowerCase()) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 15)
    : [];

  const handleSearchSelect = (slug: string) => {
    setSearchQuery('');
    setShowDropdown(false);
    setShowSearch(false);
    router.push(`/${slug}-video-downloader`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      setShowSearch(false);
      router.push(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleMobileSearchOpen = () => {
    setShowSearch(true);
    setTimeout(() => mobileInputRef.current?.focus(), 100);
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/blog', label: 'Blog' },
    { href: '/library', label: 'Library' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-black/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src={brand.site_logo_light || '/images/logo.svg'} alt={brand.site_name || ''} width={32} height={32} className="h-8 w-8 dark:hidden" />
          <Image src={brand.site_logo_dark || '/images/logo-dark.svg'} alt={brand.site_name || ''} width={32} height={32} className="h-8 w-8 hidden dark:block" />
          <span className="text-lg font-bold text-slate-900 dark:text-white hidden sm:inline">
            {brand.site_name}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side: Desktop search + theme + mobile buttons */}
        <div className="flex items-center gap-2" ref={searchRef}>
          {/* Desktop search */}
          <div className="hidden md:block relative">
            <form onSubmit={handleSearchSubmit}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setShowDropdown(false); inputRef.current?.blur(); } }}
                placeholder="Search platforms..."
                className="w-48 lg:w-56 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                style={{ fontSize: '16px' }}
              />
            </form>
            {/* Desktop dropdown */}
            {showDropdown && filteredPlatforms.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
                {filteredPlatforms.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => handleSearchSelect(p.slug)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0">
                      {p.name.charAt(0)}
                    </span>
                    <span className="truncate">{p.name} <span className="text-slate-400 dark:text-slate-500">Downloader</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile search button */}
          <button
            onClick={handleMobileSearchOpen}
            className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowSearch(false)}>
          <div className="bg-white dark:bg-zinc-950 p-4 border-b" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  placeholder="Search platforms..."
                  className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <button type="button" onClick={() => setShowSearch(false)} className="px-3 text-sm text-slate-500">
                Cancel
              </button>
            </form>
            {/* Mobile dropdown */}
            {showDropdown && filteredPlatforms.length > 0 && (
              <div className="mt-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden max-h-80 overflow-y-auto">
                {filteredPlatforms.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => handleSearchSelect(p.slug)}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-900 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 last:border-0"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0">
                      {p.name.charAt(0)}
                    </span>
                    <span className="truncate">{p.name} <span className="text-slate-400 dark:text-slate-500">Downloader</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-white dark:bg-black px-4 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
