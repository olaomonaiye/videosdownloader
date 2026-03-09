import { redirect } from 'next/navigation';

// 301 redirect: /blog/[slug] → /[slug] (blog posts are now at root level)
export default function BlogPostRedirect({ params }: { params: { slug: string } }) {
  redirect(`/${params.slug}`);
}
