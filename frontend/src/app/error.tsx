'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-black px-4">
      <h1 className="text-8xl font-bold text-red-500">500</h1>
      <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Something Went Wrong</h2>
      <p className="mt-2 text-slate-500 dark:text-slate-400">An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="btn-primary mt-8">Try Again</button>
    </div>
  );
}
