'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PRIA v7</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Neuroinclusive Curriculum Planning</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-slate-900 dark:text-white">{user?.full_name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PDC Module */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">PDC Module</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Plan de Desarrollo Curricular - Create and manage neuroinclusive curriculum plans powered by AI
            </p>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
              Manage PDC
            </button>
          </div>

          {/* Planning Module */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 border-l-4 border-green-500">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Trimester Planning</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Create weekly and daily lesson plans with neuroinclusive adaptations for diverse learners
            </p>
            <button className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 transition-colors">
              Start Planning
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-slate-700 dark:text-slate-300">Backend API Connected</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-slate-700 dark:text-slate-300">Database Ready</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-slate-700 dark:text-slate-300">AI Integration (Week 2)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
