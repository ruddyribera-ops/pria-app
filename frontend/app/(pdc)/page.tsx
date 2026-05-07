'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { usePDCStore } from '@/app/store/pdcStore';

export default function PDCListPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { pdcs, loading, error, fetchPDCs, deletePDC } = usePDCStore();
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Fetch PDCs
    fetchPDCs({
      subject: filterSubject || undefined,
      grade_level: filterGrade || undefined,
    });
  }, [isAuthenticated, filterSubject, filterGrade, fetchPDCs, router]);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this PDC?')) {
      await deletePDC(id);
    }
  };

  const handleCreate = () => {
    router.push('/pdc/new');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Curriculum Plans (PDC)
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Manage neuroinclusive curriculum adaptations powered by AI
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              aria-label="Create new PDC"
            >
              + New PDC
            </button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>Logged in as <strong>{user?.full_name}</strong></span>
            <span className="text-slate-300">•</span>
            <a href="/dashboard" className="text-blue-600 hover:underline dark:text-blue-400">
              Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                placeholder="e.g., Matemáticas"
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Grade Level
              </label>
              <input
                type="text"
                placeholder="e.g., 1ro Primaria"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading PDCs...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 text-red-700 dark:text-red-300">
            <p className="font-medium">Error loading PDCs</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : pdcs.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No curriculum plans found
            </p>
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              aria-label="Create your first PDC"
            >
              + Create your first PDC
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pdcs.map((pdc) => (
              <div
                key={pdc.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <h3 className="text-lg font-bold truncate">{pdc.title}</h3>
                  <p className="text-sm opacity-90 mt-1">
                    {pdc.subject} • {pdc.grade_level}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-medium">
                      Details
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="text-slate-600 dark:text-slate-400">Version:</span>{' '}
                        <span className="font-medium text-slate-900 dark:text-white">{pdc.version}</span>
                      </p>
                      <p>
                        <span className="text-slate-600 dark:text-slate-400">Trimester:</span>{' '}
                        <span className="font-medium text-slate-900 dark:text-white">{pdc.trimester || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-slate-600 dark:text-slate-400">Units:</span>{' '}
                        <span className="font-medium text-slate-900 dark:text-white">
                          {pdc.content?.units?.length || 0}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Created: {new Date(pdc.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Updated: {new Date(pdc.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                  <button
                    onClick={() => router.push(`/pdc/${pdc.id}`)}
                    className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
                    aria-label="Edit PDC"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pdc.id)}
                    className="py-2 px-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    aria-label="Delete PDC"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
