'use client';

import { useAuthStore } from '@/app/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PDCEditor from '@/app/components/pdc/PDCEditor';

export default function PDCDetailPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <PDCEditor />;
}
