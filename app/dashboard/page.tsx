import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome to your Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resume Analysis Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Resume Analysis</h2>
              <p className="text-gray-600 mb-4">Upload your resume and job description to get instant feedback.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Start Analysis
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <p className="text-gray-600">No recent activity</p>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="mt-8">
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
