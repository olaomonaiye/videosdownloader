'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Loader2, Link as LinkIcon, AlertCircle, Film, Music, Clock, User, HardDrive } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDownloadTray } from '@/contexts/DownloadTrayContext';
import type { DownloadAnalysis, VideoFormat } from '@/lib/types';

const DEFAULT_THUMBNAIL = '/images/og-default.svg';
const BRAND_SUFFIX = 'Videos Downloader videosdownloader.app';

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

interface DownloadFormProps {
  platformSlug?: string;
  placeholder?: string;
}

export function DownloadForm({ platformSlug, placeholder }: DownloadFormProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
  const [result, setResult] = useState<DownloadAnalysis | null>(null);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const analyzeRef = useRef<AbortController | null>(null);
  const lastAnalyzedUrl = useRef('');
  const { addDownload } = useDownloadTray();

  const doAnalyze = useCallback(async (inputUrl: string) => {
    const trimmed = inputUrl.trim();
    if (!trimmed || !isValidUrl(trimmed)) return;
    if (trimmed === lastAnalyzedUrl.current) return;
    lastAnalyzedUrl.current = trimmed;

    // Cancel any in-flight analysis
    if (analyzeRef.current) analyzeRef.current.abort();
    analyzeRef.current = new AbortController();

    setStatus('analyzing');
    setError('');
    setResult(null);
    setDownloadingId(null);

    try {
      const data = await publicApi.analyzeUrl(trimmed);
      setResult(data);
      setStatus('ready');
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      setError(err.response?.data?.error?.message || 'Failed to analyze URL. Please check the URL and try again.');
      setStatus('error');
      lastAnalyzedUrl.current = ''; // allow retry
    }
  }, []);

  // Auto-analyze on paste
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (isValidUrl(pasted)) {
      // setUrl will be handled by onChange, but start analyze immediately
      setTimeout(() => doAnalyze(pasted.trim()), 50);
    }
  }, [doAnalyze]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  }, []);

  // Also auto-analyze when URL changes (debounced)
  useEffect(() => {
    if (!url.trim() || !isValidUrl(url)) return;
    const timer = setTimeout(() => doAnalyze(url), 600);
    return () => clearTimeout(timer);
  }, [url, doAnalyze]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doAnalyze(url);
  };

  const handleDownload = async (format: VideoFormat) => {
    if (!result) return;
    setDownloadingId(format.format_id);
    setError('');

    try {
      const data = await publicApi.initiateDownload({
        url: result.url,
        format: format.format_id,
        title: result.title,
        needsMerge: format.needsMerge || false,
        type: format.type || 'video',
      });

      if (data.downloadUrl) {
        const title = data.title || result.title || 'download';
        const ext = format.ext || 'mp4';
        const brandedName = `${title} - [${BRAND_SUFFIX}].${ext}`;

        // Add to download tray — streams via fetch with progress tracking
        addDownload({ title, filename: brandedName, url: data.downloadUrl });
      }
    } catch {
      setError('Failed to start download. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const videoFormats = result?.formats.filter(f => f.type === 'video') || [];
  const audioFormats = result?.formats.filter(f => f.type === 'audio') || [];
  const thumbnail = result?.thumbnail || DEFAULT_THUMBNAIL;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="url"
              value={url}
              onChange={handleChange}
              onPaste={handlePaste}
              placeholder={placeholder || 'Paste your video URL here...'}
              className="input-field pl-12 h-14 text-base"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === 'analyzing' || !url.trim()}
            className="btn-primary h-14 px-8 text-base whitespace-nowrap"
          >
            {status === 'analyzing' ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</>
            ) : (
              <><Download className="h-5 w-5" /> Download</>
            )}
          </button>
        </div>
      </form>

      {/* Analyzing indicator */}
      {status === 'analyzing' && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600 dark:text-brand-400" />
          <span className="text-sm text-brand-700 dark:text-brand-300">Analyzing video... Please wait.</span>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview Card + Format Table */}
      {status === 'ready' && result && (
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-lg">
          {/* Video Preview */}
          <div className="flex flex-col sm:flex-row gap-4 p-4">
            <div className="relative w-full sm:w-48 aspect-video sm:aspect-auto sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-900">
              <img
                src={thumbnail}
                alt={result.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_THUMBNAIL; }}
              />
              {result.duration_display && (
                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                  {result.duration_display}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight line-clamp-2">
                {result.title}
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {result.uploader && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {result.uploader}
                  </span>
                )}
                {result.duration_display && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {result.duration_display}
                  </span>
                )}
                {result.platform && (
                  <span className="text-brand-600 dark:text-brand-400 font-medium">
                    {result.platform.name}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {videoFormats.length + audioFormats.length} formats available
              </p>
            </div>
          </div>

          {/* Format Tables */}
          <div className="border-t border-slate-200 dark:border-zinc-800">
            {/* Video formats */}
            {videoFormats.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900/50 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  <Film className="h-3.5 w-3.5" /> Video ({videoFormats.length})
                </div>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {videoFormats.map((f) => (
                    <div key={f.format_id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-white w-16">
                          {f.resolution}
                        </span>
                        <span className="text-xs text-slate-400 uppercase font-mono">{f.ext}</span>
                        {f.fps && f.fps > 30 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                            {f.fps}fps
                          </span>
                        )}
                        {f.filesize_display ? (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <HardDrive className="h-3 w-3" /> {f.filesize_display}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Size N/A</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(f)}
                        disabled={downloadingId === f.format_id}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ml-2',
                          downloadingId === f.format_id
                            ? 'bg-slate-100 dark:bg-zinc-900 text-slate-400 cursor-wait'
                            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow'
                        )}
                      >
                        {downloadingId === f.format_id ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading...</>
                        ) : (
                          <><Download className="h-3.5 w-3.5" /> Download</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio formats */}
            {audioFormats.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900/50 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  <Music className="h-3.5 w-3.5" /> Audio ({audioFormats.length})
                </div>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {audioFormats.map((f) => (
                    <div key={f.format_id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-white w-16">
                          {f.resolution}
                        </span>
                        <span className="text-xs text-slate-400 uppercase font-mono">{f.ext}</span>
                        {f.filesize_display ? (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <HardDrive className="h-3 w-3" /> {f.filesize_display}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Size N/A</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(f)}
                        disabled={downloadingId === f.format_id}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ml-2',
                          downloadingId === f.format_id
                            ? 'bg-slate-100 dark:bg-zinc-900 text-slate-400 cursor-wait'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow'
                        )}
                      >
                        {downloadingId === f.format_id ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading...</>
                        ) : (
                          <><Download className="h-3.5 w-3.5" /> Download</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No formats fallback */}
            {videoFormats.length === 0 && audioFormats.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No downloadable formats found for this video.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
