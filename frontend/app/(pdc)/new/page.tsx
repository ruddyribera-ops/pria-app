'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/store/authStore';
import { usePDCStore } from '@/app/store/pdcStore';

const SUBJECTS = [
  'Lengua y Literatura',
  'Matemáticas',
  'Ciencias Naturales',
  'Ciencias Sociales',
  'Educación Física',
  'Música',
  'Artes Plásticas',
  'Tecnología',
  'Inglés',
  'Educación Religiosa',
];

const GRADES = [
  'Nidito',
  'Pre-Kínder',
  'Kínder',
  '1ro Primaria',
  '2do Primaria',
  '3ro Primaria',
  '4to Primaria',
  '5to Primaria',
  '6to Primaria',
  '1ro Secundaria',
  '2do Secundaria',
  '3ro Secundaria',
  '4to Secundaria',
  '5to Secundaria',
];

const TRIMESTERS = [
  { id: 'T1', name: 'Trimestre 1' },
  { id: 'T2', name: 'Trimestre 2' },
  { id: 'T3', name: 'Trimestre 3' },
];

export default function NewPDCPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { createPDC, loading } = usePDCStore();

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    grade_level: '',
    trimester: 'T1',
  });

  const [error, setError] = useState('');

  // Check auth
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.subject) {
      setError('Subject is required');
      return;
    }
    if (!formData.grade_level) {
      setError('Grade level is required');
      return;
    }

    try {
      const newPDC = await createPDC({
        title: formData.title,
        subject: formData.subject,
        grade_level: formData.grade_level,
        trimester: formData.trimester,
        content: {
          units: [],
          general_objectives: [],
          assessment_methods: [],
          resources: {},
        },
      });

      // Redirect to editor
      router.push(`/pdc/${newPDC.id}`);
    } catch (err) {
      setError('Failed to create PDC. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create PDC</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Create a new curriculum plan with neuroinclusive adaptations
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              PDC Title *
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Fractions Unit - Grade 1"
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Subject *
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              required
            >
              <option value="">Select a subject</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level */}
          <div>
            <label htmlFor="grade_level" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Grade Level *
            </label>
            <select
              id="grade_level"
              name="grade_level"
              value={formData.grade_level}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              required
            >
              <option value="">Select a grade</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Trimester */}
          <div>
            <label htmlFor="trimester" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Trimester
            </label>
            <select
              id="trimester"
              name="trimester"
              value={formData.trimester}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              {TRIMESTERS.map((trimester) => (
                <option key={trimester.id} value={trimester.id}>
                  {trimester.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Creating...' : 'Create PDC'}
          </button>

          {/* Cancel Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/pdc')}
              className="text-blue-600 hover:underline text-sm dark:text-blue-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
