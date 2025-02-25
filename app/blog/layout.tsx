import BlogHeader from './components/BlogHeader';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <BlogHeader />
      <main>{children}</main>
    </div>
  );
}
