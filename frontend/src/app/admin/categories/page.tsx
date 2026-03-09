'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { DataTable, Column } from '@/components/admin/DataTable';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: '', description: '' });

  useEffect(() => { adminApi.getCategories().then(data => { setCategories(data); setLoading(false); }); }, []);

  const handleCreate = async () => {
    if (!newCat.name) return;
    const cat = await adminApi.createCategory(newCat);
    setCategories([...categories, cat]);
    setNewCat({ name: '', description: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await adminApi.deleteCategory(id);
    setCategories(categories.filter(c => c.id !== id));
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (c) => <span className="font-medium text-slate-900 dark:text-white">{c.name}</span> },
    { key: 'slug', label: 'Slug', sortable: true, render: (c) => <span className="text-slate-500 dark:text-slate-400">{c.slug}</span> },
    { key: 'posts', label: 'Posts', sortable: true, getValue: (c) => c._count?.posts || 0, render: (c) => <span className="text-slate-500 dark:text-slate-400">{c._count?.posts || 0}</span> },
    { key: 'isDefault', label: 'Default', sortable: true, getValue: (c) => c.isDefault ? 1 : 0, render: (c) => <span className="text-slate-500 dark:text-slate-400">{c.isDefault ? '✓' : '—'}</span> },
  ];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Categories</h1>
      <div className="card mb-6">
        <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">Add Category</h3>
        <div className="flex gap-3">
          <input value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} className="input-field flex-1" placeholder="Category name" />
          <button onClick={handleCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>
      <DataTable
        data={categories}
        columns={columns}
        searchPlaceholder="Search categories..."
        searchableKeys={['name', 'slug']}
        emptyMessage="No categories found"
        defaultPageSize={10}
        actions={(c) => !c.isDefault ? (
          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
        ) : null}
      />
    </div>
  );
}
