'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import { adminApi } from '@/lib/api';
import Link from 'next/link';

export default function EditPlatformPage() {
  const router = useRouter();
  const { id } = useParams();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  useEffect(() => { adminApi.getPlatform(id as string).then(setForm); }, [id]);
  const handleSubmit = async () => { setLoading(true); try { await adminApi.updatePlatform(id as string, form); router.push('/admin/platforms/list'); } catch(e:any) { alert('Failed'); } setLoading(false); };
  return (
    <div><div className="flex items-center gap-4 mb-6"><Link href="/admin/platforms/list" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Platform: {form.name}</h1></div>
    <div className="max-w-3xl space-y-4">
      <div><label className="block text-sm font-medium mb-1">Name</label><input value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} className="input-field" /></div>
      <div><label className="block text-sm font-medium mb-1">Slug</label><input value={form.slug||''} onChange={e => setForm({...form, slug: e.target.value})} className="input-field" /></div>
      <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} className="input-field" rows={4} /></div>
      <div><label className="block text-sm font-medium mb-1">Logo URL</label><input value={form.logoUrl||''} onChange={e => setForm({...form, logoUrl: e.target.value})} className="input-field" /></div>
      <div><label className="block text-sm font-medium mb-1">Meta Title</label><input value={form.metaTitle||''} onChange={e => setForm({...form, metaTitle: e.target.value})} className="input-field" /></div>
      <div><label className="block text-sm font-medium mb-1">Meta Description</label><textarea value={form.metaDescription||''} onChange={e => setForm({...form, metaDescription: e.target.value})} className="input-field" rows={2} /></div>
      <div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive||false} onChange={e => setForm({...form, isActive: e.target.checked})} />Active (public page visible)</label></div>
      <div><label className="block text-sm font-medium mb-1">FAQ JSON</label><textarea value={typeof form.faqJson === 'string' ? form.faqJson : JSON.stringify(form.faqJson || [], null, 2)} onChange={e => { try { setForm({...form, faqJson: JSON.parse(e.target.value)}); } catch {} }} className="input-field font-mono text-xs" rows={8} /></div>
      <button onClick={handleSubmit} disabled={loading} className="btn-primary"><Save className="h-4 w-4" /> Save Platform</button>
    </div></div>
  );
}
