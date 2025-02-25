import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import './setup';

test.describe('Process Analysis API', () => {
  let supabase;

  test.beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create client with service role key
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  });

  test('should process resume and job description', async ({ request }) => {
    // Use the test user we created in SQL
    const userId = '12345678-1234-1234-1234-123456789012';
    console.log('Using test user ID:', userId);

    // Read test files
    const resumePath = path.join(__dirname, 'test-files', 'sample.txt');
    const jobDescPath = path.join(__dirname, 'test-files', 'sample-job.txt');

    console.log('Reading test files from:', { resumePath, jobDescPath });

    // Check if files exist
    if (!fs.existsSync(resumePath)) {
      throw new Error(`Resume file not found at ${resumePath}`);
    }
    if (!fs.existsSync(jobDescPath)) {
      throw new Error(`Job description file not found at ${jobDescPath}`);
    }

    const resumeText = await fs.promises.readFile(resumePath, 'utf8');
    const jobDescText = await fs.promises.readFile(jobDescPath, 'utf8');

    // Validate file contents
    if (!resumeText) {
      throw new Error('Resume file is empty');
    }
    if (!jobDescText) {
      throw new Error('Job description file is empty');
    }

    console.log('File contents:', {
      resume: resumeText.substring(0, 100) + '...',
      jobDesc: jobDescText.substring(0, 100) + '...'
    });

    // Make request to analyze endpoint with service role key
    console.log('Making request to /api/analyze');
    const response = await request.post('/api/analyze', {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      multipart: {
        resume: {
          name: 'sample.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(resumeText),
        },
        jobDescription: {
          name: 'sample-job.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(jobDescText),
        },
        userId: {
          name: 'userId',
          mimeType: 'text/plain',
          buffer: Buffer.from(userId),
        }
      }
    });

    // Log response details
    console.log('Response status:', response.status());
    console.log('Response status text:', response.statusText());
    
    const responseText = await response.text();
    console.log('Response text:', responseText);

    // If response is not ok, log more details
    if (!response.ok()) {
      console.error('Request failed:', {
        status: response.status(),
        statusText: response.statusText(),
        body: responseText
      });

      try {
        const errorData = JSON.parse(responseText);
        throw new Error(`API error: ${errorData.error || 'Unknown error'}`);
      } catch (e) {
        throw new Error(`API error (${response.status()}): ${responseText}`);
      }
    }

    // Parse response
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
      
      if (data.error) {
        throw new Error(`API error: ${data.error}`);
      }
      
      expect(data.analysisId).toBeDefined();

      // Verify the analysis was created
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', data.analysisId)
        .single();

      if (analysisError) {
        throw new Error(`Failed to verify analysis: ${analysisError.message}`);
      }

      expect(analysis).toBeDefined();
      expect(analysis.user_id).toBe(userId);
      expect(analysis.status).toBe('completed');
      expect(analysis.results).toBeDefined();
      expect(analysis.results.score).toBe(0.85);
      expect(analysis.results.match_points).toHaveLength(2);
    } catch (error) {
      console.error('Failed to parse response:', error);
      throw error;
    }
  });
});
