'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CRM from '../pages/CRM';

export default function CRMPage() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login page.');
    }
  }, [router]);

  return <CRM />;
}
