import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_TIMEOUT = 10000; // 10 seconds
const API_URL = 'http://localhost:3002';

// Supabase configuration
const supabaseUrl = 'https://uzztoxyfbiqqzguzjdwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6enRveHlmYmlxcXpndXpqZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5Njc2ODQsImV4cCI6MjA1NDU0MzY4NH0.zrldht4STCesXTjhDLmTj_j4cPCzqh-lgy1sSrzUwUs';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to create a timeout promise
const timeout = (ms) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
);

// Helper function to make API calls with timeout
async function fetchWithTimeout(url, options) {
  try {
    const response = await Promise.race([
      fetch(url, options),
      timeout(API_TIMEOUT)
    ]);
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    throw error;
  }
}

// Test health check endpoint
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check endpoint...');
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/health`);
    const data = await response.json();
    console.log('✅ Health Check Response:', data);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

// Test authentication
async function testAuth() {
  console.log('\n🔍 Testing Authentication...');
  try {
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: 'vicsicard@gmail.com',
      password: 'Jerrygarcia1993!'
    });

    if (error) throw error;
    console.log('✅ Authentication successful');
    return session.access_token;
  } catch (error) {
    console.error('❌ Authentication Failed:', error.message);
    throw error;
  }
}

// Test analyze endpoint
async function testAnalyze(token) {
  console.log('\n🔍 Testing Analyze endpoint...');
  try {
    const formData = new FormData();
    const filePath = path.join(__dirname, 'sample-resume.txt');
    const fileContent = fs.readFileSync(filePath);
    formData.append('file', fileContent, { filename: 'resume.txt' });

    const response = await fetchWithTimeout(`${API_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${data.error || 'Unknown error'}`);
    }

    console.log('✅ Analyze Response:', data);
    return data;
  } catch (error) {
    console.error('❌ Analyze Failed:', error.message);
    throw error;
  }
}

// Test optimize endpoint
async function testOptimize(token, analysisId) {
  console.log('\n🔍 Testing Optimize endpoint...');
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        analysisId,
        selectedSuggestions: [1, 2]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${data.error || 'Unknown error'}`);
    }

    console.log('✅ Optimize Response:', data);
    return data;
  } catch (error) {
    console.error('❌ Optimize Failed:', error.message);
    throw error;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting API Tests...');
  
  try {
    // Test health check first
    const healthOk = await testHealthCheck();
    if (!healthOk) {
      console.error('❌ Health check failed, skipping remaining tests');
      return;
    }

    // Test authentication
    const token = await testAuth();
    if (!token) {
      console.error('❌ Authentication failed, skipping remaining tests');
      return;
    }

    // Test analyze endpoint
    const analyzeResult = await testAnalyze(token);
    if (!analyzeResult || !analyzeResult.id) {
      console.error('❌ Analyze failed, skipping optimize test');
      return;
    }

    // Test optimize endpoint
    await testOptimize(token, analyzeResult.id);

    console.log('\n✨ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the tests
runTests();
