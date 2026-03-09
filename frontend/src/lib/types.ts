export interface Platform {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  faqJson: Array<{ q: string; a: string }> | null;
  downloadCount: number;
  supportedFormats: any;
  isActive: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  readingTimeMinutes: number;
  viewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  author: { displayName: string; avatarUrl: string | null };
  categories: Array<{ name: string; slug: string }>;
  tags?: Array<{ name: string; slug: string }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { posts: number };
}

export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  status: string;
  showInHeader: boolean;
  showInFooter: boolean;
}

export interface SiteSettings {
  site_name: string;
  site_url: string;
  site_tagline: string;
  site_description: string;
  site_logo_light: string;
  site_logo_dark: string;
  site_favicon: string;
  site_og_image_default: string;
  footer_text: string;
  contact_email: string;
  google_analytics_id: string;
  clarity_project_id: string;
  social_twitter: string;
  social_facebook: string;
  social_github: string;
  maintenance_mode: string;
  [key: string]: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  height: number;
  filesize: number | null;
  filesize_display: string | null;
  fps: number | null;
  vcodec: string | null;
  acodec: string | null;
  type: 'video' | 'audio';
  abr?: number;
  needsMerge?: boolean;
}

export interface DownloadAnalysis {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  duration_display: string | null;
  uploader: string | null;
  formats: VideoFormat[];
  url: string;
  platform: { name: string; slug: string; logoUrl: string | null } | null;
}

export interface DownloadResult {
  downloadUrl: string;
  title: string;
  downloadId: string | null;
}
