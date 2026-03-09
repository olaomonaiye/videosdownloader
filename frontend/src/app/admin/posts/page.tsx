'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { DataTable, Column } from '@/components/admin/DataTable';

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPosts({ page: 1, pageSize: 9999 }).then(r => {
      setPosts(r.data || []);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    await adminApi.deletePost(id);
    setPosts(posts.filter(p => p.id !== id));
  };

  const columns: Column<any>[] = [
    { key: 'title', label: 'Title', sortable: true, render: (p) => <span className="font-medium text-slate-900 dark:text-white">{p.title}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (p) => <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${p.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{p.status}</span> },
    { key: 'author', label: 'Author', sortable: true, getValue: (p) => p.author?.displayName || '', render: (p) => <span className="text-slate-500 dark:text-slate-400">{p.author?.displayName}</span> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (p) => <span className="text-slate-500 dark:text-slate-400">{formatDate(p.createdAt)}</span> },
    { key: 'viewCount', label: 'Views', sortable: true, render: (p) => <span className="text-slate-500 dark:text-slate-400">{p.viewCount}</span> },
  ];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Blog Posts</h1>
        <Link href="/admin/posts/new" className="btn-primary"><Plus className="h-4 w-4" /> New Post</Link>
      </div>
      <DataTable
        data={posts}
        columns={columns}
        searchPlaceholder="Search posts..."
        searchableKeys={['title', 'status', 'author']}
        emptyMessage="No posts found"
        actions={(post) => (
          <div className="flex gap-1">
            {post.status === 'PUBLISHED' && post.slug && (
              <a href={`/${post.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-green-600" title="View post"><ExternalLink className="h-4 w-4" /></a>
            )}
            <Link href={`/admin/posts/${post.id}`} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></Link>
            <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
      />
    </div>
  );
}
