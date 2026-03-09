'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

export type DownloadStatus = 'preparing' | 'downloading' | 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled';

export interface TrayDownload {
  id: string;
  title: string;
  filename: string;
  url: string;
  status: DownloadStatus;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  statusMessage: string;
  createdAt: number;
  error?: string;
  blobUrl?: string;
}

interface DownloadTrayContextType {
  downloads: TrayDownload[];
  addDownload: (params: { title: string; filename: string; url: string }) => string;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeCount: number;
}

const DownloadTrayContext = createContext<DownloadTrayContextType | null>(null);

const MAX_CONCURRENT = 4;
const STORAGE_KEY = 'download-tray-state';

function generateId() {
  return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Trigger browser file-save via a temporary <a> click */
function triggerFileSave(blobUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 200);
}

function loadPersistedState(): TrayDownload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: TrayDownload[] = JSON.parse(raw);
    return items.map(d => {
      // Blob URLs are invalid after page reload — clear them
      const cleaned = { ...d, blobUrl: undefined };
      if (d.status === 'downloading' || d.status === 'preparing' || d.status === 'processing') {
        return { ...cleaned, status: 'failed' as const, statusMessage: 'Interrupted — click retry', error: 'Download was interrupted' };
      }
      return cleaned;
    });
  } catch {
    return [];
  }
}

function persistState(downloads: TrayDownload[]) {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = downloads.slice(0, 50).map(d => ({ ...d, blobUrl: undefined }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

export function DownloadTrayProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<TrayDownload[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const pendingQueue = useRef<string[]>([]);
  const blobUrls = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setDownloads(loadPersistedState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) persistState(downloads);
  }, [downloads, mounted]);

  const activeCount = downloads.filter(d =>
    d.status === 'downloading' || d.status === 'preparing' || d.status === 'processing'
  ).length;

  const updateDownload = useCallback((id: string, updates: Partial<TrayDownload>) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  // Use a ref for startFetch so processQueue (and other callbacks) always call the latest version
  const startFetchRef = useRef<(id: string, url: string, filename: string) => void>();

  const processQueue = useCallback(() => {
    setDownloads(prev => {
      const active = prev.filter(d =>
        d.status === 'downloading' || d.status === 'preparing' || d.status === 'processing'
      ).length;
      const slots = MAX_CONCURRENT - active;
      if (slots <= 0 || pendingQueue.current.length === 0) return prev;
      const toStart = pendingQueue.current.splice(0, slots);
      toStart.forEach(id => {
        const dl = prev.find(d => d.id === id);
        if (dl) setTimeout(() => startFetchRef.current?.(id, dl.url, dl.filename), 0);
      });
      return prev;
    });
  }, []);

  const startFetch = useCallback(async (id: string, url: string, filename: string) => {
    const controller = new AbortController();
    abortControllers.current.set(id, controller);
    updateDownload(id, { status: 'preparing', statusMessage: 'Preparing download...', progress: 0, downloadedBytes: 0, error: undefined });

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      updateDownload(id, {
        status: 'downloading',
        statusMessage: contentLength ? `Downloading... 0% — 0 B / ${formatBytes(contentLength)}` : 'Downloading...',
        totalBytes: contentLength,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        downloadedBytes += value.length;

        const progress = contentLength > 0 ? Math.round((downloadedBytes / contentLength) * 100) : 0;
        const msg = contentLength > 0
          ? `Downloading... ${progress}% — ${formatBytes(downloadedBytes)} / ${formatBytes(contentLength)}`
          : `Downloading... ${formatBytes(downloadedBytes)}`;
        updateDownload(id, { status: 'downloading', progress, downloadedBytes, statusMessage: msg });
      }

      updateDownload(id, { status: 'processing', statusMessage: 'Saving file...' });

      const blob = new Blob(chunks as BlobPart[]);
      const blobUrl = URL.createObjectURL(blob);
      blobUrls.current.set(id, blobUrl);

      // Auto-save: try to trigger browser save directly
      triggerFileSave(blobUrl, filename);

      updateDownload(id, {
        status: 'completed',
        progress: 100,
        downloadedBytes: downloadedBytes || contentLength,
        statusMessage: `Done — ${formatBytes(downloadedBytes || contentLength)}`,
        blobUrl,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      updateDownload(id, { status: 'failed', statusMessage: 'Failed', error: err.message || 'Download failed' });
    } finally {
      abortControllers.current.delete(id);
      processQueue();
    }
  }, [updateDownload, processQueue]);

  // Keep ref in sync so other callbacks always call the latest startFetch
  useEffect(() => { startFetchRef.current = startFetch; }, [startFetch]);

  const addDownload = useCallback((params: { title: string; filename: string; url: string }) => {
    const id = generateId();
    const newDl: TrayDownload = {
      id, title: params.title, filename: params.filename, url: params.url,
      status: 'preparing', progress: 0, totalBytes: 0, downloadedBytes: 0,
      statusMessage: 'Queued...', createdAt: Date.now(),
    };

    setDownloads(prev => {
      const updated = [newDl, ...prev];
      const active = updated.filter(d =>
        d.status === 'downloading' || d.status === 'preparing' || d.status === 'processing'
      ).length;
      if (active <= MAX_CONCURRENT) {
        setTimeout(() => startFetchRef.current?.(id, params.url, params.filename), 0);
      } else {
        pendingQueue.current.push(id);
      }
      return updated;
    });

    setIsOpen(true);
    return id;
  }, []);

  const pauseDownload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) controller.abort();
    abortControllers.current.delete(id);
    updateDownload(id, { status: 'paused', statusMessage: 'Paused' });
  }, [updateDownload]);

  const resumeDownload = useCallback((id: string) => {
    setDownloads(prev => {
      const dl = prev.find(d => d.id === id);
      if (!dl) return prev;
      const active = prev.filter(d =>
        d.status === 'downloading' || d.status === 'preparing' || d.status === 'processing'
      ).length;
      if (active < MAX_CONCURRENT) {
        setTimeout(() => startFetchRef.current?.(id, dl.url, dl.filename), 0);
      } else {
        pendingQueue.current.push(id);
        updateDownload(id, { status: 'preparing', statusMessage: 'Queued...', progress: 0, downloadedBytes: 0 });
      }
      return prev;
    });
  }, [updateDownload]);

  const cancelDownload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) controller.abort();
    abortControllers.current.delete(id);
    pendingQueue.current = pendingQueue.current.filter(pid => pid !== id);
    updateDownload(id, { status: 'cancelled', statusMessage: 'Cancelled' });
  }, [updateDownload]);

  const removeDownload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) controller.abort();
    abortControllers.current.delete(id);
    pendingQueue.current = pendingQueue.current.filter(pid => pid !== id);
    const blobUrl = blobUrls.current.get(id);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrls.current.delete(id); }
    setDownloads(prev => prev.filter(d => d.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads(prev => {
      prev.forEach(d => {
        if (d.status === 'completed' || d.status === 'cancelled' || d.status === 'failed') {
          const blobUrl = blobUrls.current.get(d.id);
          if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrls.current.delete(d.id); }
        }
      });
      return prev.filter(d => d.status !== 'completed' && d.status !== 'cancelled' && d.status !== 'failed');
    });
  }, []);

  return (
    <DownloadTrayContext.Provider value={{
      downloads, addDownload, pauseDownload, resumeDownload, cancelDownload,
      removeDownload, clearCompleted, isOpen, setIsOpen, activeCount,
    }}>
      {children}
    </DownloadTrayContext.Provider>
  );
}

export function useDownloadTray() {
  const ctx = useContext(DownloadTrayContext);
  if (!ctx) throw new Error('useDownloadTray must be used within DownloadTrayProvider');
  return ctx;
}
