import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'

// Suppress console errors in tests
global.console.error = vi.fn()
global.console.warn = vi.fn()
