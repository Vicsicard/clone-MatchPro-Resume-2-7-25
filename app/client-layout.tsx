'use client';

import { useEffect } from 'react';
import { logStyles, logStylesheets } from './debug';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    console.log('ClientLayout mounted');
    const body = document.body;
    logStyles(body, 'body');
    logStylesheets();
  }, []);

  return <>{children}</>;
}
