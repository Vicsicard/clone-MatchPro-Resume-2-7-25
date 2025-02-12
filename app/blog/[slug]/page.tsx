'use client';

import { createBlogClient } from '@/app/supabase/blog-client';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
      <div className="min-h-screen bg-white">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
          <div className="mt-8">
            <a 
              href="/blog"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Blog
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <a 
            href="/blog"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Blog
          </a>
        </div>

        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-8">
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {post.tags}
            </span>
          </div>

          <div className="mt-8">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
