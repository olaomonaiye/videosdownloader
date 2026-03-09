'use client';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/DataTable';

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.getTags().then(data => { setTags(data); setLoading(false); }); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    await adminApi.deleteTag(id);
    setTags(tags.filter(t => t.id !== id));
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (t) => <span className="font-medium text-slate-900 dark:text-white">{t.name}</span> },
    { key: 'slug', label: 'Slug', sortable: true, render: (t) => <span className="text-slate-500 dark:text-slate-400">{t.slug}</span> },
    { key: 'posts', label: 'Posts', sortable: true, getValue: (t) => t._count?.posts || 0, render: (t) => <span className="text-slate-500 dark:text-slate-400">{t._count?.posts || 0}</span> },
  ];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Tags</h1>
      <DataTable
        data={tags}
        columns={columns}
        searchPlaceholder="Search tags..."
        searchableKeys={['name', 'slug']}
        emptyMessage="No tags found"
        defaultPageSize={20}
        actions={(t) => (
          <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        )}
      />
    </div>
  );
}
