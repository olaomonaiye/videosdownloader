'use client';
import { useState } from 'react';
import { X, ChevronUp, ChevronDown, Pause, Play, Trash2, RefreshCw, CheckCircle2, AlertCircle, Download, Loader2, XCircle } from 'lucide-react';
import { useDownloadTray, type TrayDownload, type DownloadStatus } from '@/contexts/DownloadTrayContext';
import { cn } from '@/lib/utils';

function StatusIcon({ status }: { status: DownloadStatus }) {
  switch (status) {
    case 'preparing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'downloading': return <Download className="h-4 w-4 text-brand-500 animate-pulse" />;
    case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'paused': return <Pause className="h-4 w-4 text-slate-400" />;
    case 'cancelled': return <XCircle className="h-4 w-4 text-slate-400" />;
  }
}

function ProgressBar({ download }: { download: TrayDownload }) {
  const isActive = download.status === 'downloading' || download.status === 'preparing' || download.status === 'processing';

  return (
    <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          download.status === 'completed' && 'bg-green-500',
          download.status === 'failed' && 'bg-red-500',
          download.status === 'paused' && 'bg-slate-400',
          download.status === 'cancelled' && 'bg-slate-300 dark:bg-zinc-700',
          isActive && 'bg-brand-500',
          download.status === 'preparing' && 'animate-pulse',
        )}
        style={{ width: `${download.status === 'preparing' ? 100 : download.progress}%` }}
      />
    </div>
  );
}

function DownloadItem({ download }: { download: TrayDownload }) {
  const { pauseDownload, resumeDownload, cancelDownload, removeDownload } = useDownloadTray();
  const isActive = download.status === 'downloading' || download.status === 'preparing' || download.status === 'processing';

  return (
    <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <StatusIcon status={download.status} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={download.title}>
            {download.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {download.statusMessage}
          </p>
          {(isActive || download.status === 'paused') && (
            <div className="mt-1.5">
              <ProgressBar download={download} />
            </div>
          )}
          {download.status === 'failed' && download.error && (
            <p className="text-xs text-red-500 mt-1">{download.error}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {download.status === 'completed' && download.blobUrl && (
            <a href={download.blobUrl} download={download.filename} className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 hover:text-green-600" title="Save to device">
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
          {download.status === 'downloading' && (
            <button onClick={() => pauseDownload(download.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Pause">
              <Pause className="h-3.5 w-3.5" />
            </button>
          )}
          {(download.status === 'paused' || download.status === 'failed') && (
            <button onClick={() => resumeDownload(download.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-brand-600" title="Resume">
              {download.status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
          )}
          {isActive && (
            <button onClick={() => cancelDownload(download.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500" title="Cancel">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!isActive && (
            <button onClick={() => removeDownload(download.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500" title="Remove">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DownloadTray() {
  const { downloads, isOpen, setIsOpen, activeCount, clearCompleted } = useDownloadTray();
  const [expanded, setExpanded] = useState(false);

  if (downloads.length === 0) return null;

  const completedCount = downloads.filter(d => d.status === 'completed').length;
  const failedCount = downloads.filter(d => d.status === 'failed').length;

  // Collapsed tray bar
  if (!isOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div
          onClick={() => setIsOpen(true)}
          className="mx-auto max-w-md mb-4 mx-4 sm:mx-auto cursor-pointer"
        >
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg px-4 py-3 flex items-center justify-between hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-brand-600" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {activeCount > 0
                  ? `${activeCount} download${activeCount > 1 ? 's' : ''} in progress`
                  : `${downloads.length} download${downloads.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <ChevronUp className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  // Expanded modal / tray
  return (
    <>
      {/* Backdrop for full modal mode */}
      {expanded && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setExpanded(false)} />
      )}

      <div className={cn(
        'fixed z-50 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col',
        expanded
          ? 'inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl top-[10vh] bottom-[10vh] rounded-2xl'
          : 'bottom-0 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[420px] rounded-t-2xl sm:rounded-2xl max-h-[60vh]'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Downloads
              {activeCount > 0 && (
                <span className="ml-1.5 text-xs font-normal text-slate-500">({activeCount} active)</span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {(completedCount > 0 || failedCount > 0) && (
              <button
                onClick={clearCompleted}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Clear done
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button onClick={() => { setIsOpen(false); setExpanded(false); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Download list */}
        <div className="flex-1 overflow-y-auto">
          {downloads.map(dl => (
            <DownloadItem key={dl.id} download={dl} />
          ))}
        </div>

        {/* Footer summary */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-zinc-800 shrink-0">
          <p className="text-xs text-slate-400 text-center">
            {completedCount > 0 && `${completedCount} completed`}
            {completedCount > 0 && (activeCount > 0 || failedCount > 0) && ' · '}
            {activeCount > 0 && `${activeCount} in progress`}
            {activeCount > 0 && failedCount > 0 && ' · '}
            {failedCount > 0 && `${failedCount} failed`}
            {completedCount === 0 && activeCount === 0 && failedCount === 0 && `${downloads.length} downloads`}
          </p>
        </div>
      </div>
    </>
  );
}
