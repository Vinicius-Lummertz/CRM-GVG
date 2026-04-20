'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Chat from '../../pages/Chat';

interface ChatPageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const router = useRouter();
  const { clientId } = use(params);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [router]);

  return <Chat params={{ clientId }} />;
}
