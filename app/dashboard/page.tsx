import { createServerSupabaseClient } from '@/app/supabase/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome to your Dashboard</h1>
          <p className="text-gray-600 mb-4">
            You are signed in as: {session.user.email}
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Upload Resume
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Start New Analysis
                </button>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h2>
              <p className="text-gray-600">No recent activity to display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
