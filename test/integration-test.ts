const { createClient } = require('@supabase/supabase-js');
import * as fs from 'fs';
import * as path from 'path';
import FormDataNode from 'form-data';
import fetch, { RequestInit, Response } from 'node-fetch';

const API_URL = 'http://localhost:3002';
const TIMEOUT = 30000; // 30 seconds
const TEST_FILE_PATH = path.join(__dirname, 'test-files', 'test-resume.pdf');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to create timeout promise
const timeout = (ms: number): Promise<never> => new Promise((_, reject) =>
  setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
);

// Helper function to make API calls with timeout
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await Promise.race([
      fetch(url, options),
      timeout(TIMEOUT)
    ]);
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getAuthToken(): Promise<string> {
  try {
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!
    });

    if (error) throw error;
    if (!session) throw new Error('No session returned');

    return session.access_token;
  } catch (error) {
    throw new Error(`Auth error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function uploadResume(token: string, filePath: string): Promise<Response> {
  try {
    const form = new FormDataNode();
    form.append('resume', fs.createReadStream(filePath));
    form.append('jobDescription', 'Software Engineer position...');

    return await fetchWithTimeout(`${API_URL}/api/analyze`, {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    throw new Error(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function optimizeResume(token: string, analysisId: string, suggestions: number[]): Promise<Response> {
  try {
    return await fetchWithTimeout(`${API_URL}/api/optimize`, {
      method: 'POST',
      body: JSON.stringify({
        analysisId,
        selectedSuggestions: suggestions
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    throw new Error(`Optimization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function verifyAnalysisRecord(token: string, analysisId: string): Promise<any> {
  try {
    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) throw error;
    if (!analysis) throw new Error('Analysis record not found');

    return analysis;
  } catch (error) {
    throw new Error(`Analysis record error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function downloadAndVerifyFile(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to download optimized file');
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    console.log('File verification:', {
      contentType,
      size: contentLength ? `${Math.round(parseInt(contentLength) / 1024)}KB` : 'unknown'
    });

    return true;
  } catch (error) {
    throw new Error(`Download error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function runTest() {
  try {
    const token = await getAuthToken();
    const response = await uploadResume(token, TEST_FILE_PATH);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Upload failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const analysis = await verifyAnalysisRecord(token, data.id);

    if (analysis.status === 'processing') {
      console.log('Waiting for analysis to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const optimizeResponse = await optimizeResume(token, data.id, [1, 2, 3]);
    if (!optimizeResponse.ok) {
      const errorData = await optimizeResponse.json();
      throw new Error(`Optimization failed: ${optimizeResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const optimizeData = await optimizeResponse.json();
    await downloadAndVerifyFile(optimizeData.downloadUrl);

    console.log('Test successful:', data);
  } catch (error) {
    console.error('Test failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

runTest();
