import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import './setup';

let supabase;

test.describe('Resume Analysis Flow', () => {
  test.beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not set');
    }

    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseKey);

    // Verify we can sign in with the existing user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    });

    console.log('Sign in verification:', { signInData, signInError });

    if (signInError) {
      throw new Error(`Failed to verify test user credentials: ${signInError.message}`);
    }
  });

  test('should complete full analysis flow', async ({ page }) => {
    // Enable verbose logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.error('Browser error:', err));

    // 1. Navigate to sign-in page
    console.log('Navigating to sign-in page...');
    await page.goto('/auth/sign-in');
    
    // Wait for the form to be ready
    await page.waitForSelector('input[type="email"]');
    await page.waitForSelector('input[type="password"]');
    
    console.log('Filling credentials...');
    // 2. Sign in
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
    
    // Take a screenshot before clicking submit
    await page.screenshot({ path: 'test-results/before-submit.png' });
    
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for any response
    await page.waitForResponse(response => response.url().includes('/auth/v1/token'), {
      timeout: 10000
    });
    
    // Take a screenshot after submission
    await page.screenshot({ path: 'test-results/after-submit.png' });
    
    console.log('Waiting for navigation to pricing...');
    // Wait for navigation to pricing page
    try {
      await page.waitForURL('/pricing', { timeout: 20000 });
    } catch (error) {
      console.error('Navigation failed:', error);
      console.log('Current URL:', page.url());
      await page.screenshot({ path: 'test-results/navigation-error.png' });
      throw error;
    }

    await expect(page).toHaveURL('/pricing');

    // Take screenshot of pricing page
    await page.screenshot({ path: 'test-results/pricing-page.png' });

    // Start free trial
    console.log('Starting free trial...');
    await page.click('button:text("Start Free Trial")');

    // Wait for navigation to dashboard after trial activation
    console.log('Waiting for navigation to dashboard...');
    await page.waitForURL('/dashboard', { timeout: 20000 });
    await expect(page).toHaveURL('/dashboard');

    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-results/dashboard.png' });

    console.log('Waiting for file upload inputs...');
    // Wait for dropzone inputs to be ready
    await page.waitForSelector('input[accept=".pdf,.doc,.docx"]', { timeout: 10000 });

    // Get all file inputs
    const fileInputs = await page.$$('input[accept=".pdf,.doc,.docx"]');
    console.log(`Found ${fileInputs.length} file inputs`);

    if (fileInputs.length < 2) {
      throw new Error(`Expected 2 file inputs, found ${fileInputs.length}`);
    }

    // 3. Upload resume
    console.log('Uploading resume...');
    await fileInputs[0].setInputFiles('tests/test-files/sample.pdf');
    
    // 4. Upload job description
    console.log('Uploading job description...');
    await fileInputs[1].setInputFiles('tests/test-files/sample-job.pdf');
    
    // Take screenshot after uploads
    await page.screenshot({ path: 'test-results/after-uploads.png' });
    
    // 5. Start analysis
    console.log('Starting analysis and waiting for response...');
    const [response] = await Promise.all([
      // Wait for the /api/analyze response
      page.waitForResponse(async response => {
        const isAnalyze = response.url().includes('/api/analyze');
        if (isAnalyze) {
          console.log('Analysis API Status:', response.status());
          console.log('Analysis API Status Text:', response.statusText());
          try {
            const data = await response.json();
            console.log('Analysis API Response:', JSON.stringify(data, null, 2));
          } catch (err) {
            console.error('Error parsing response:', err);
            const text = await response.text();
            console.log('Raw response text:', text);
          }
        }
        return isAnalyze;
      }, { timeout: 30000 }),
      // Click the button
      page.click('button:text("Start Analysis")')
    ]);

    // Log response status
    console.log('Analysis response status:', response.status());
    
    // Check if the response was successful
    if (!response.ok()) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || 'Unknown error';
      } catch (err) {
        console.error('Error parsing error response:', err);
        const text = await response.text();
        console.log('Raw error response text:', text);
        errorMessage = text || 'Unknown error';
      }
      throw new Error(`Analysis API error: ${errorMessage}`);
    }

    // Take a screenshot after analysis starts
    await page.screenshot({ path: 'test-results/analysis-started.png' });

    // 6. Wait for analysis to complete (with timeout)
    console.log('Waiting for analysis to complete...');
    let startTime = Date.now();
    const maxWaitTime = 60000; // 60 seconds total timeout

    while (Date.now() - startTime < maxWaitTime) {
      // Take status screenshot for debugging
      await page.screenshot({ path: `test-results/status-${Date.now()}.png` });

      // Check for any error messages
      const errorElement = await page.locator('.text-red-700').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        throw new Error(`Analysis error: ${errorText}`);
      }

      // Check for completion
      const completedStatus = await page.locator('text=Analysis completed!').isVisible();
      if (completedStatus) {
        console.log('Analysis completed successfully');
        break;
      }

      // Check for failure
      const failedStatus = await page.locator('text=Analysis failed').isVisible();
      if (failedStatus) {
        throw new Error('Analysis failed');
      }

      // Wait a bit before checking again
      await page.waitForTimeout(2000);
    }

    if (Date.now() - startTime >= maxWaitTime) {
      throw new Error('Analysis timed out after 60 seconds');
    }

    // Take screenshot of results
    await page.screenshot({ path: 'test-results/analysis-results.png' });

    // 7. Verify results are displayed
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    
    // 8. Check database for analysis record
    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    expect(error).toBeNull();
    expect(analysis).toBeTruthy();
    expect(analysis.status).toBe('completed');

    console.log('Test completed successfully');
  });
});
