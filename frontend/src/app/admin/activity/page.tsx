'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { DataTable, Column } from '@/components/admin/DataTable';

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getActivityLogs({ page: 1, pageSize: 9999 }).then(r => {
      setLogs(r.data || []);
      setLoading(false);
    });
  }, []);

  const columns: Column<any>[] = [
    { key: 'user', label: 'User', sortable: true, getValue: (l) => l.user?.displayName || '', render: (l) => <span className="text-slate-900 dark:text-white">{l.user?.displayName}</span> },
    { key: 'action', label: 'Action', sortable: true, render: (l) => <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 font-mono">{l.action}</span> },
    { key: 'entityType', label: 'Entity', sortable: true, render: (l) => <span className="text-slate-500 dark:text-slate-400">{l.entityType || '—'}</span> },
    { key: 'ipAddress', label: 'IP', sortable: true, render: (l) => <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{l.ipAddress?.slice(0, 15)}</span> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (l) => <span className="text-slate-500 dark:text-slate-400">{formatDate(l.createdAt)}</span> },
  ];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Activity Logs</h1>
      <DataTable
        data={logs}
        columns={columns}
        searchPlaceholder="Search activity..."
        searchableKeys={['user', 'action', 'entityType', 'ipAddress']}
        emptyMessage="No activity logs found"
        defaultPageSize={50}
      />
    </div>
  );
}
