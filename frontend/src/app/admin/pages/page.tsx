'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/DataTable';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.getPages({ pageSize: 9999 }).then(r => { setPages(r.data || []); setLoading(false); }); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    await adminApi.deletePage(id);
    setPages(pages.filter(p => p.id !== id));
  };

  const columns: Column<any>[] = [
    { key: 'title', label: 'Title', sortable: true, render: (p) => <span className="font-medium text-slate-900 dark:text-white">{p.title}</span> },
    { key: 'slug', label: 'Slug', sortable: true, render: (p) => <span className="text-slate-500 dark:text-slate-400">/{p.slug}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (p) => <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{p.status}</span> },
    { key: 'nav', label: 'Nav', sortable: false, render: (p) => <span className="text-slate-500 dark:text-slate-400 text-xs">{p.showInHeader ? 'H' : ''}{p.showInFooter ? 'F' : ''}{!p.showInHeader && !p.showInFooter ? '—' : ''}</span> },
  ];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Static Pages</h1>
        <Link href="/admin/pages/new" className="btn-primary"><Plus className="h-4 w-4" /> New Page</Link>
      </div>
      <DataTable
        data={pages}
        columns={columns}
        searchPlaceholder="Search pages..."
        searchableKeys={['title', 'slug', 'status']}
        emptyMessage="No pages created yet"
        defaultPageSize={20}
        actions={(p) => (
          <div className="flex gap-1">
            {p.status === 'PUBLISHED' && p.slug && (
              <a href={`/pages/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-green-600" title="View page"><ExternalLink className="h-4 w-4" /></a>
            )}
            <Link href={`/admin/pages/${p.id}`} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></Link>
            <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
      />
    </div>
  );
}
