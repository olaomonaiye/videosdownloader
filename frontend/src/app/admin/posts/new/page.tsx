'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Upload, Link2, Image as ImageIcon } from 'lucide-react';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [thumbTab, setThumbTab] = useState<'url' | 'upload'>('url');
  const [thumbPreview, setThumbPreview] = useState('');
  const [excerptTouched, setExcerptTouched] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', excerpt: '', status: 'DRAFT', categoryIds: [] as string[], tagNames: [] as string[], metaTitle: '', metaDescription: '', thumbnailUrl: '' });

  useEffect(() => { adminApi.getCategories().then(setCategories); }, []);

  // Auto-fill excerpt from content when excerpt hasn't been manually edited
  useEffect(() => {
    if (!excerptTouched && form.content) {
      const plain = stripHtml(form.content);
      if (plain.length > 0) {
        const autoExcerpt = plain.length > 200 ? plain.slice(0, 197) + '...' : plain;
        setForm(f => ({ ...f, excerpt: autoExcerpt }));
      }
    }
  }, [form.content, excerptTouched]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setThumbPreview(localUrl);
    try {
      const { url } = await adminApi.uploadImage(file);
      setThumbPreview(url);
      setForm(f => ({ ...f, thumbnailUrl: url }));
    } catch {
      alert('Failed to upload image');
      setThumbPreview('');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await adminApi.createPost(form);
      router.push('/admin/posts');
    } catch (err: any) { alert(err.response?.data?.error?.message || 'Failed to create post'); }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/posts" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Post</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="Post title" /></div>
          <div><label className="block text-sm font-medium mb-1">Content</label><RichTextEditor content={form.content} onChange={(html) => setForm({...form, content: html})} placeholder="Write your post content..." /></div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Excerpt</label>
              {!excerptTouched && form.excerpt && <span className="text-xs text-slate-400">Auto-generated</span>}
            </div>
            <textarea value={form.excerpt} onChange={e => { setExcerptTouched(true); setForm({...form, excerpt: e.target.value}); }} className="input-field" rows={3} placeholder="Short summary (auto-fills from content)" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-3">Publish</h3>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="input-field mb-3"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
            <button onClick={handleSubmit} disabled={loading || !form.title || !form.content} className="btn-primary w-full"><Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Post'}</button>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Categories</h3>
            {categories.map(c => (
              <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={form.categoryIds.includes(c.id)}
                  onChange={e => setForm({...form, categoryIds: e.target.checked ? [...form.categoryIds, c.id] : form.categoryIds.filter(id => id !== c.id)})} />
                {c.name}
              </label>
            ))}
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Thumbnail</h3>
            <div className="flex border-b border-slate-200 dark:border-zinc-700 mb-3">
              <button onClick={() => setThumbTab('url')} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${thumbTab === 'url' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><Link2 className="h-3.5 w-3.5" /> URL</button>
              <button onClick={() => setThumbTab('upload')} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${thumbTab === 'upload' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><Upload className="h-3.5 w-3.5" /> Upload</button>
            </div>
            {thumbTab === 'url' ? (
              <input value={form.thumbnailUrl} onPaste={e => { e.preventDefault(); const v = e.clipboardData.getData('text').trim(); if (v) { try { const u = new URL(v); if (['http:', 'https:'].includes(u.protocol)) { setForm({...form, thumbnailUrl: v}); setThumbPreview(v); } } catch {} } }} onChange={e => { setForm({...form, thumbnailUrl: e.target.value}); setThumbPreview(e.target.value); }} className="input-field" placeholder="https://..." />
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 dark:border-zinc-600 rounded-lg p-4 text-center hover:border-brand-500 transition-colors cursor-pointer"
                onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (e: any) => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); }; inp.click(); }}
              >
                <ImageIcon className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Drop image here or click to browse</p>
              </div>
            )}
            {(thumbPreview || form.thumbnailUrl) && (
              <div className="mt-3 relative">
                <img key={thumbPreview || form.thumbnailUrl} src={thumbPreview || form.thumbnailUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-zinc-700" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }} />
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">SEO</h3>
            <input value={form.metaTitle} onChange={e => setForm({...form, metaTitle: e.target.value})} className="input-field mb-2" placeholder="Meta title" />
            <textarea value={form.metaDescription} onChange={e => setForm({...form, metaDescription: e.target.value})} className="input-field" rows={2} placeholder="Meta description" />
          </div>
        </div>
      </div>
    </div>
  );
}
