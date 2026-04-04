'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Chat from '../../pages/Chat';

interface ChatPageProps {
  params: {
    clientId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [router]);

  return <Chat params={params} />;
}