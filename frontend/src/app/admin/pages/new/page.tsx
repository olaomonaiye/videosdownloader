'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

export default function NewStaticPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', slug: '', status: 'DRAFT', metaTitle: '', metaDescription: '', showInHeader: false, showInFooter: false });
  const handleSubmit = async () => {
    setLoading(true);
    try { await adminApi.createPage(form); router.push('/admin/pages'); } catch(e: any) { alert(e.response?.data?.error?.message || 'Failed'); }
    setLoading(false);
  };
  return (
    <div><div className="flex items-center gap-4 mb-6"><Link href="/admin/pages" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Page</h1></div>
    <div className="max-w-3xl space-y-4">
      <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="Page title" />
      <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" placeholder="slug (auto-generated if empty)" />
      <RichTextEditor content={form.content} onChange={(html) => setForm({...form, content: html})} placeholder="Page content..." />
      <div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.showInHeader} onChange={e => setForm({...form, showInHeader: e.target.checked})} />Show in Header</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.showInFooter} onChange={e => setForm({...form, showInFooter: e.target.checked})} />Show in Footer</label></div>
      <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-field w-40"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
      <input value={form.metaTitle} onChange={e => setForm({...form, metaTitle: e.target.value})} className="input-field" placeholder="Meta title" />
      <textarea value={form.metaDescription} onChange={e => setForm({...form, metaDescription: e.target.value})} className="input-field" rows={2} placeholder="Meta description" />
      <button onClick={handleSubmit} disabled={loading || !form.title} className="btn-primary"><Save className="h-4 w-4" /> Save Page</button>
    </div></div>
  );
}
