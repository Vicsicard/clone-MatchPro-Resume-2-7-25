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

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const supabase = createBlogClient();
        const { data, error: queryError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('tags', 'matchproresume')
          .order('created_at', { ascending: false });

        if (queryError) throw queryError;
        setPosts(data || []);
      } catch (err: any) {
        console.error('Error fetching blog posts:', err);
        setError('Failed to load blog posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Blog</h1>
          <div className="animate-pulse space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 p-6 rounded-lg">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Blog</h1>
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Blog</h1>
        
        <div className="space-y-12">
          {posts.map((post) => {
            // Extract first paragraph for excerpt (skip image lines)
            const excerpt = post.content
              .split('\n')
              .find(line => line.length > 0 && !line.startsWith('![')) || '';
              
            return (
              <article 
                key={post.id} 
                className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
              >
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 hover:text-blue-600">
                    <a href={`/blog/${post.slug}`}>{post.title}</a>
                  </h2>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                    <time dateTime={post.created_at}>
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                  </div>

                  <div className="prose prose-lg max-w-none mb-6">
                    <p className="text-gray-600">
                      {excerpt}
                    </p>
                  </div>
                  
                  <a 
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Read more
                    <svg 
                      className="ml-2 w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        
        {posts.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No blog posts found</h3>
            <p className="mt-2 text-gray-500">Check back later for new content!</p>
          </div>
        )}
      </div>
    </div>
  );
}
