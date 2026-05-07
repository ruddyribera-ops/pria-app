export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white">
            PRIA v7
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Curriculum Planning & Trimester Management System
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Powered by NeuroSIS • Made in Bolivia
          </p>
        </div>

        {/* Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Backend API</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Database</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                Ready
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Frontend</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                In Progress
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-slate-600 dark:text-slate-400 text-sm space-y-2">
          <p>Week 1: Foundation Phase - 95% Complete</p>
          <p>Next: Authentication UI and PDC Module</p>
        </div>
      </div>
    </main>
  );
}
