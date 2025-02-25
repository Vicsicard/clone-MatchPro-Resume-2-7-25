'use client';

import { createBlogClient } from '@/app/supabase/blog-client';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import BlogFooter from '../components/BlogFooter';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  created_at: string;
  tags: string;
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        const supabase = createBlogClient();
        const { data, error: queryError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', params.slug)
          .single();

        if (queryError) throw queryError;
        if (!data) throw new Error('Post not found');
        
        setPost(data);
      } catch (err: any) {
        console.error('Error fetching blog post:', err);
        setError(err.message === 'Post not found' 
          ? 'Sorry, this blog post could not be found.' 
          : 'Failed to load blog post. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
        <div className="mt-8">
          <Link 
            href="/blog"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link 
          href="/blog"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Blog
        </Link>
      </div>

      <article>
        <header className="mb-8 pb-8 border-b border-gray-200">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <time dateTime={post.created_at} className="text-gray-500">
              {new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {post.tags}
            </span>
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          <style jsx global>{`
            .prose {
              max-width: none;
            }
            .prose p {
              margin-bottom: 1.5em;
              line-height: 1.8;
            }
            .prose h2 {
              font-size: 1.875rem;
              margin-top: 2.5em;
              margin-bottom: 1em;
              font-weight: 700;
              color: #1a202c;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 0.5em;
            }
            .prose h3 {
              font-size: 1.5rem;
              margin-top: 2em;
              margin-bottom: 1em;
              font-weight: 600;
              color: #2d3748;
            }
            .prose ul {
              margin-top: 1em;
              margin-bottom: 1em;
              list-style-type: disc;
              padding-left: 1.5em;
            }
            .prose ul li {
              margin-top: 0.5em;
              margin-bottom: 0.5em;
              padding-left: 0.5em;
            }
            .prose blockquote {
              font-style: italic;
              border-left: 4px solid #4299e1;
              padding-left: 1.5em;
              margin: 1.5em 0;
              background-color: #f7fafc;
              padding: 1em 1.5em;
              border-radius: 0.375rem;
            }
            .prose code {
              background-color: #2d3748;
              color: #e2e8f0;
              padding: 0.2em 0.4em;
              border-radius: 0.25em;
              font-size: 0.875em;
            }
            .prose pre {
              background-color: #2d3748;
              padding: 1em;
              border-radius: 0.5em;
              overflow-x: auto;
              margin: 1.5em 0;
            }
            .prose pre code {
              background-color: transparent;
              padding: 0;
              border-radius: 0;
              color: #e2e8f0;
            }
            .prose img {
              margin: 2em auto;
              border-radius: 0.5em;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .prose a {
              color: #4299e1;
              text-decoration: none;
              border-bottom: 2px solid transparent;
              transition: border-color 0.2s ease;
            }
            .prose a:hover {
              border-bottom-color: #4299e1;
            }
            .prose hr {
              margin: 3em 0;
              border: 0;
              height: 2px;
              background-color: #e2e8f0;
            }
            .prose table {
              width: 100%;
              border-collapse: collapse;
              margin: 2em 0;
            }
            .prose th {
              background-color: #f7fafc;
              font-weight: 600;
              text-align: left;
              padding: 0.75em 1em;
              border-bottom: 2px solid #e2e8f0;
            }
            .prose td {
              padding: 0.75em 1em;
              border-bottom: 1px solid #e2e8f0;
            }
            .prose tr:hover {
              background-color: #f7fafc;
            }
          `}</style>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              img: ({ node, ...props }) => (
                <img {...props} className="rounded-lg shadow-lg" />
              ),
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {post.content
              .replace(/<p><strong>About <\/strong>[\s\S]*?<\/p>/, '')
              .split('About MatchPro Resume')[0]
              .trim()}
          </ReactMarkdown>
        </div>

        <BlogFooter />
      </article>
    </div>
  );
}
