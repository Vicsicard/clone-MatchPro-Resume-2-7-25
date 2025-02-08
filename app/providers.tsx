'use client';

import { useEffect } from 'react';
import { logStyles, logStylesheets } from './debug';

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
    <>
      <StyleDebugger />
      {children}
    </>
  );
}
