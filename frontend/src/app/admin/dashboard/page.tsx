'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Globe, FileText, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'last28days', label: 'Last 28 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
];

export default function DashboardPage() {
  const [range, setRange] = useState('last28days');
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, c, p] = await Promise.all([
          adminApi.getDashboardStats({ range }),
          adminApi.getChartDownloads({ range }),
          adminApi.getChartPlatforms(),
        ]);
        setStats(s);
        setChartData(c);
        setPlatformData(p || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      }
      setLoading(false);
    }
    load();
  }, [range]);

  const statCards = stats ? [
    { label: 'Total Downloads', value: formatNumber(stats.totalDownloads || 0), icon: Download, color: 'text-brand-600' },
    { label: 'Today', value: formatNumber(stats.todayDownloads || 0), icon: TrendingUp, color: 'text-green-600' },
    { label: 'Active Platforms', value: stats.activePlatforms || 0, icon: Globe, color: 'text-purple-600' },
    { label: 'Published Posts', value: stats.publishedPosts || 0, icon: FileText, color: 'text-indigo-600' },
    { label: 'Failure Rate', value: `${stats.failureRate || 0}%`, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Completed', value: formatNumber(stats.completedDownloads || 0), icon: Clock, color: 'text-emerald-600' },
  ] : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your platform performance</p>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="input-field w-auto">
          {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs font-medium text-slate-500 uppercase">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downloads Over Time */}
        <div className="card">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Downloads Over Time</h3>
          <div className="h-64">
            {chartData?.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Top Platforms */}
        <div className="card">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Top Platforms</h3>
          <div className="h-64">
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="downloadCount" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Status Breakdown — as stat cards instead of pie chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Download Status</h3>
          {chartData?.statusBreakdown?.length > 0 ? (
            <div className="space-y-3">
              {chartData.statusBreakdown.map((s: any) => {
                const icons: Record<string, any> = { COMPLETED: CheckCircle, FAILED: XCircle, PENDING: Loader2, PROCESSING: Clock };
                const colors: Record<string, string> = { COMPLETED: 'text-green-600', FAILED: 'text-red-500', PENDING: 'text-amber-500', PROCESSING: 'text-blue-500' };
                const bgColors: Record<string, string> = { COMPLETED: 'bg-green-50 dark:bg-green-900/20', FAILED: 'bg-red-50 dark:bg-red-900/20', PENDING: 'bg-amber-50 dark:bg-amber-900/20', PROCESSING: 'bg-blue-50 dark:bg-blue-900/20' };
                const Icon = icons[s.status] || Clock;
                return (
                  <div key={s.status} className={`flex items-center justify-between rounded-lg p-3 ${bgColors[s.status] || 'bg-slate-50 dark:bg-zinc-900'}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${colors[s.status] || 'text-slate-500'}`} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.status}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(s.count)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
