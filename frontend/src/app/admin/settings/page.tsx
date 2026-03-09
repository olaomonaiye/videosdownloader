'use client';
import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/api';

const TABS = ['branding', 'seo', 'analytics', 'social', 'limits'];

export default function SettingsPage() {
  const [tab, setTab] = useState('branding');
  const [settings, setSettings] = useState<any[]>([]);
  const [ytdlp, setYtdlp] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, string>>({});

  useEffect(() => { adminApi.getSettings(tab).then(setSettings); }, [tab]);
  useEffect(() => { adminApi.getYtdlpStatus().then(setYtdlp).catch(() => {}); }, []);

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(dirty).map(([key, value]) => ({ key, value }));
    if (updates.length) { await adminApi.updateSettings(updates); setDirty({}); }
    setSaving(false);
  };

  const getValue = (key: string) => dirty[key] !== undefined ? dirty[key] : settings.find(s => s.key === key)?.value || '';

  return (
    <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>
    <div className="flex gap-2 mb-6 overflow-x-auto">{TABS.map(t => (
      <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm rounded-lg font-medium capitalize whitespace-nowrap ${t === tab ? 'bg-brand-600 text-white' : 'bg-white dark:bg-zinc-950 border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900'}`}>{t}</button>
    ))}</div>

    <div className="card space-y-4">
      {settings.map(s => (
        <div key={s.key}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{s.key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</label>
          {s.description && <p className="text-xs text-slate-400 mb-1">{s.description}</p>}
          {s.type === 'BOOLEAN' ? (
            <select value={getValue(s.key)} onChange={e => setDirty({...dirty, [s.key]: e.target.value})} className="input-field w-40"><option value="true">Enabled</option><option value="false">Disabled</option></select>
          ) : s.type === 'TEXT' ? (
            <textarea value={getValue(s.key)} onChange={e => setDirty({...dirty, [s.key]: e.target.value})} className="input-field" rows={3} />
          ) : (
            <input value={getValue(s.key)} onChange={e => setDirty({...dirty, [s.key]: e.target.value})} className="input-field" />
          )}
        </div>
      ))}
      <button onClick={handleSave} disabled={saving || Object.keys(dirty).length === 0} className="btn-primary"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}</button>
    </div>

    {/* yt-dlp status */}
    <div className="card mt-6">
      <h3 className="font-semibold mb-3">yt-dlp Status</h3>
      <p className="text-sm text-slate-500">Version: <span className="font-mono text-slate-900 dark:text-white">{ytdlp?.version || 'Unknown'}</span></p>
      <p className="text-sm text-slate-500 mt-1">Status: {ytdlp?.available ? '✅ Available' : '❌ Unavailable'}</p>
      <button onClick={() => adminApi.updateYtdlp().then(r => alert(r.output || 'Updated')).catch(() => alert('Failed'))} className="btn-secondary mt-3"><RefreshCw className="h-4 w-4" /> Update yt-dlp</button>
    </div></div>
  );
}
