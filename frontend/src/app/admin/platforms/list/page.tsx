'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/DataTable';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch ALL platforms in batches
    const fetchAll = async () => {
      let all: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const r = await adminApi.getPlatforms({ page, pageSize: 500 });
        all = [...all, ...(r.data || [])];
        hasMore = r.meta && page < r.meta.totalPages;
        page++;
      }
      setPlatforms(all);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await adminApi.updatePlatform(id, { isActive: !current });
    setPlatforms(platforms.map(p => p.id === id ? {...p, isActive: !current} : p));
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (p) => (
      <div className="flex items-center gap-2">
        <PlatformIcon name={p.name} logoUrl={p.logoUrl} size="sm" />
        <span className="font-medium text-slate-900 dark:text-white">{p.name}</span>
      </div>
    )},
    { key: 'slug', label: 'Slug', sortable: true, render: (p) => <span className="text-slate-500 dark:text-slate-400">{p.slug}</span> },
    { key: 'downloadCount', label: 'Downloads', sortable: true, render: (p) => <span className="text-slate-500 dark:text-slate-400">{p.downloadCount?.toLocaleString()}</span> },
    { key: 'isActive', label: 'Active', sortable: true, getValue: (p) => p.isActive ? 1 : 0, render: (p) => (
      <button onClick={() => toggleActive(p.id, p.isActive)}>
        {p.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
      </button>
    )},
    { key: 'isAutoDiscovered', label: 'Auto', sortable: true, getValue: (p) => p.isAutoDiscovered ? 1 : 0, render: (p) => <span className="text-slate-500 dark:text-slate-400">{p.isAutoDiscovered ? '🤖' : '✋'}</span> },
  ];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platforms</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{platforms.length.toLocaleString()} total</span>
      </div>
      <DataTable
        data={platforms}
        columns={columns}
        searchPlaceholder="Search platforms..."
        searchableKeys={['name', 'slug']}
        emptyMessage="No platforms found"
        defaultPageSize={50}
        actions={(p) => (
          <Link href={`/admin/platforms/${p.id}`} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></Link>
        )}
      />
    </div>
  );
}
