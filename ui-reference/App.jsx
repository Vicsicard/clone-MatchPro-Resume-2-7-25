import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PricingPage from './components/pricing/PricingPage';
import TestSupabase from './components/test/TestSupabase';
import SupabaseAuthTest from './components/test/SupabaseAuthTest';
import UploadPage from './components/upload/UploadPage';
import EnvTest from './components/test/EnvTest';
import SimpleAuthTest from './components/test/SimpleAuthTest';
import AuthTest from './components/test/AuthTest';
import Home from './components/home';
import About from './components/about/About';
import Features from './components/features/Features';
import AuthPage from './components/auth/AuthPage';
import FreeSignup from './components/auth/FreeSignup';
import Dashboard from './components/dashboard/Dashboard';
import AuthCallback from './components/auth/AuthCallback';
import ProtectedRoute from './components/auth/ProtectedRoute';

const App = () => {
  return (
    <div className="app">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/test-supabase" element={<TestSupabase />} />
        <Route path="/auth-test" element={<SupabaseAuthTest />} />
        <Route path="/test-env" element={<EnvTest />} />
        <Route path="/simple-auth-test" element={<SimpleAuthTest />} />
        <Route path="/new-auth-test" element={<AuthTest />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/free-signup" element={<FreeSignup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
};

export default App;