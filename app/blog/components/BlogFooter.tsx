export default function BlogFooter() {
  return (
    <div className="mt-16 pt-8 border-t border-gray-200">
      <p className="text-lg text-gray-700 mb-8 italic">
        Start revamping your resume today and set the stage for success in your job search journey!
      </p>

      <div className="bg-blue-50 rounded-xl p-8 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              About <a href="https://MatchProResume.com" className="text-blue-600 hover:text-blue-800">MatchPro Resume</a>
            </h3>
            
            <p className="text-gray-700 mb-6 leading-relaxed">
              MatchPro Resume is your AI-powered career accelerator, designed to optimize your resume for any job posting. 
              Using advanced AI and ATS-friendly formatting, we help you tailor your resume to highlight the key skills 
              and qualifications employers are looking for—ensuring you stand out and land more interviews.
            </p>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center text-gray-700">
                <span className="text-blue-500 mr-2">🔹</span>
                <span><strong>Get more job offers</strong> with a resume that beats Applicant Tracking Systems</span>
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-blue-500 mr-2">🔹</span>
                <span><strong>Save time</strong>—no more manual resume tweaks for every application</span>
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-blue-500 mr-2">🔹</span>
                <span><strong>Boost your chances</strong> with expert AI-driven recommendations</span>
              </li>
            </ul>

            <p className="text-gray-900 font-medium">
              🚀 <strong>Try it for free today at </strong>
              <a 
                href="https://MatchProResume.com" 
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                MatchProResume.com
              </a>
              <span className="font-medium"> and take your job search to the next level!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
