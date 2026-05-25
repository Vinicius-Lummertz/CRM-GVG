'use client';

import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Chat from '../../pages/Chat';

interface ChatPageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { clientId } = React.use(params);
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login page.');
    }
  }, [router]);

  return <Chat clientId={clientId} />;
}
