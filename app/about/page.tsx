export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">About MatchPro Resume</h1>
        
        <div className="prose prose-lg">
          <p className="text-xl text-gray-600 mb-8">
            MatchPro Resume is revolutionizing the way job seekers approach their job search by leveraging 
            cutting-edge AI technology to optimize resumes for specific job opportunities.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-8">
            Our mission is to empower job seekers with intelligent tools that maximize their chances of landing 
            their dream jobs. We believe that every candidate deserves the opportunity to present their best 
            self to potential employers.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">What Sets Us Apart</h2>
          <ul className="list-disc pl-6 text-gray-600 mb-8">
            <li className="mb-3">
              <strong>AI-Powered Analysis:</strong> Our advanced AI algorithms analyze job descriptions and 
              your resume to identify key matches and improvement opportunities.
            </li>
            <li className="mb-3">
              <strong>ATS Optimization:</strong> We ensure your resume is optimized for Applicant Tracking 
              Systems, increasing your chances of getting past initial screenings.
            </li>
            <li className="mb-3">
              <strong>Smart Recommendations:</strong> Receive personalized suggestions to enhance your resume 
              based on industry standards and job requirements.
            </li>
            <li className="mb-3">
              <strong>Time-Saving:</strong> Automatically tailor your resume for different job applications 
              without manual rewrites.
            </li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">Our Commitment</h2>
          <p className="text-gray-600 mb-8">
            We are committed to continuous innovation and improvement of our platform. Our team regularly 
            updates our AI models and features to provide the most effective resume optimization tools 
            available.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">Contact Us</h2>
          <p className="text-gray-600">
            Have questions or suggestions? We'd love to hear from you. Reach out to us at{' '}
            <a href="mailto:info@matchproresume.com" className="text-blue-600 hover:text-blue-800">
              info@matchproresume.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
