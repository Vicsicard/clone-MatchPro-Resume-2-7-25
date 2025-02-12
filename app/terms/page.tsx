export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg">
          <p className="text-gray-600 mb-8">
            Last updated: February 12, 2025
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-600">
              By accessing or using MatchPro Resume's services, you agree to be bound by these Terms of 
              Service. If you disagree with any part of the terms, you may not access our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Services</h2>
            <p className="text-gray-600 mb-4">
              MatchPro Resume provides AI-powered resume optimization services, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Resume analysis and optimization</li>
              <li>Job description matching</li>
              <li>Keyword optimization</li>
              <li>ATS compatibility checking</li>
              <li>Resume formatting and styling</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">
              When you create an account with us, you must provide accurate and complete information. You are 
              responsible for maintaining the security of your account and password.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Payment Terms</h2>
            <p className="text-gray-600 mb-4">
              Some of our services require payment. By choosing a paid service, you agree to pay all fees in 
              accordance with the pricing established for your selected subscription plan.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              The service and its original content, features, and functionality are owned by MatchPro Resume 
              and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. User Content</h2>
            <p className="text-gray-600 mb-4">
              You retain all rights to your resume content. By using our services, you grant us the right to 
              analyze and process your content to provide our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              MatchPro Resume shall not be liable for any indirect, incidental, special, consequential, or 
              punitive damages resulting from your use of our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Termination</h2>
            <p className="text-gray-600 mb-4">
              We may terminate or suspend access to our service immediately, without prior notice, for any 
              reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, 
              we will try to provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:info@matchproresume.com" className="text-blue-600 hover:text-blue-800">
                info@matchproresume.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
