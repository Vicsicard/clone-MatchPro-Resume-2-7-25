'use client';

export default function VerifyEmail() {
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Resume Matcher</h1>
        
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Check your email</h2>
            
            <div className="mb-6">
              <svg
                className="mx-auto h-12 w-12 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            
            <p className="text-gray-600 mb-4">
              A verification link has been sent to your email address.
            </p>
            <p className="text-gray-600">
              Please click the link to verify your account and complete the sign-up process.
            </p>

            <div className="mt-6 space-y-4">
              <p className="text-sm text-gray-500">
                Didn't receive the email?
              </p>
              <button
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                onClick={() => window.location.reload()}
              >
                Click here to resend
              </button>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <a
                href="/auth/login"
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                Back to sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
