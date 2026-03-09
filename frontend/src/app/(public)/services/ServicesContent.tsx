'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, ArrowUpAZ, ArrowDownAZ, Clock } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

const PAGE_SIZE = 48;

type SortOption = 'az' | 'za' | 'newest';

interface ServicesContentProps {
  initialPlatforms: any[];
  initialMeta: any;
  totalCount: number;
  initialPage?: number;
}

export function ServicesContent({ initialPlatforms, initialMeta, totalCount, initialPage = 1 }: ServicesContentProps) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState(initialPlatforms || []);
  const [meta, setMeta] = useState(initialMeta || { total: 0, totalPages: 0, page: initialPage, pageSize: PAGE_SIZE });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('az');
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const isInitialMount = useRef(true);

  const fetchPlatforms = useCallback(async (page: number, sortOpt: SortOption, searchQuery: string) => {
    setLoading(true);
    try {
      const sortMap: Record<SortOption, { sort: string; order: string }> = {
        az: { sort: 'name', order: 'asc' },
        za: { sort: 'name', order: 'desc' },
        newest: { sort: 'recent', order: 'desc' },
      };
      const { sort: s, order } = sortMap[sortOpt];
      const params: any = { pageSize: PAGE_SIZE, page, sort: s, order, includeLogos: true };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await publicApi.getPlatforms(params);
      setPlatforms(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0, page, pageSize: PAGE_SIZE });
    } catch {
      // Keep existing data on error
    }
    setLoading(false);
  }, []);

  // Refetch when search or sort changes (skip initial mount since we have SSR data)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPlatforms(1, sort, search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, sort, fetchPlatforms]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchPlatforms(page, sort, search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Update URL for SEO
    if (page === 1) {
      router.push('/services', { scroll: false });
    } else {
      router.push(`/services/page/${page}`, { scroll: false });
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setCurrentPage(1);
  };

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const total = meta.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | string)[] = [];
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(total - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < total - 2) pages.push('...');
    if (total > 1) pages.push(total);
    return pages;
  }, [meta.totalPages, currentPage]);

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">All Supported Platforms</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          Browse and search through {totalCount.toLocaleString()}+ platforms we support
        </p>

        {/* Search + Sort */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${totalCount.toLocaleString()}+ platforms...`}
              className="input-field pl-11"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-zinc-800 p-1 bg-white dark:bg-zinc-950">
            {([
              { key: 'az' as SortOption, icon: ArrowUpAZ, label: 'A-Z' },
              { key: 'za' as SortOption, icon: ArrowDownAZ, label: 'Z-A' },
              { key: 'newest' as SortOption, icon: Clock, label: 'Newest' },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => handleSortChange(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  sort === key
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className={cn('mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', loading && 'opacity-50 pointer-events-none')}>
          {platforms.map((p: any) => (
            <Link
              key={p.slug}
              href={`/${p.slug}-video-downloader`}
              className="card flex items-center gap-3 p-4 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
            >
              <PlatformIcon name={p.name} logoUrl={p.logoUrl} size="lg" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{p.name}</span>
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {platforms.length === 0 && !loading && (
          <div className="mt-12 text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No platforms found for &ldquo;{search}&rdquo;. Try a different search term.
            </p>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>

            {pageNumbers.map((p, i) =>
              typeof p === 'string' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-400">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={cn(
                    'min-w-[40px] px-3 py-2 text-sm rounded-lg border transition-colors',
                    p === currentPage
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                  )}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= meta.totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}

        {/* Total count */}
        {meta.total > 0 && (
          <p className="mt-4 text-center text-xs text-slate-400">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, meta.total)} of {meta.total.toLocaleString()} platforms
          </p>
        )}
      </div>
    </section>
  );
}
