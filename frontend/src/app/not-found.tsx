import Link from 'next/link';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-black">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20">
        <h1 className="text-8xl font-bold text-brand-600">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Page Not Found</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-center max-w-md">The page you are looking for does not exist or has been moved.</p>
        <div className="mt-8 flex gap-4">
          <Link href="/" className="btn-primary">Go Home</Link>
          <Link href="/services" className="btn-secondary">Browse Platforms</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
