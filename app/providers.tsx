'use client';

import { useEffect } from 'react';
import { logStyles, logStylesheets } from './debug';
import ClientLayout from './client-layout';

export function StyleDebugger() {
  useEffect(() => {
    console.log('StyleDebugger mounted');
    
    // Log body styles
    const body = document.body;
    logStyles(body, 'body');
    
    // Log stylesheet information
    logStylesheets();
  }, []);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClientLayout>
      <StyleDebugger />
      {children}
    </ClientLayout>
  );
}
