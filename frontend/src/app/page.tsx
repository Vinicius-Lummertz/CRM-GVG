'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Login from './pages/Login';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (isAuthenticated) {
      router.push('/crm');
    }
  }, [router]);

  return <Login />;
}