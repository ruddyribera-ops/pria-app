import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestImage } from './ocrWorker';

// Mock zipParser
vi.mock('./zipParser', () => ({
  fileToDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,SGVsbG8='),
}));

// Mock Worker - need to use jsdom environment for this test
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();

// Create a proper mock Worker class
class MockWorker {
  onmessage: ((event: { data: any }) => void) | null = null;
  onerror: ((err: Error) => void) | null = null;
  constructor(_url: URL | string, _options?: { type?: string }) {
    // Store instance for later message simulation
    MockWorker.instance = this;
  }
  postMessage = mockPostMessage;
  terminate = mockTerminate;
  static instance: MockWorker | null = null;
}

vi.stubGlobal('Worker', MockWorker);

describe('ocrWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWorker.instance = null;
  });

  it('performs OCR on image file - tests the flow', async () => {
    const mockFile = new File(['image content'], 'scan.png', { type: 'image/png' });

    // Simulate the worker completing successfully
    mockPostMessage.mockImplementation(() => {
      const worker = MockWorker.instance;
      if (worker?.onmessage) {
        worker.onmessage({ data: { type: 'done', text: 'Recognized text', confidence: 95 } });
      }
    });

    const result = await ingestImage(mockFile);

    expect(result.texts).toBeDefined();
    expect(result.warnings).toBeDefined();
    expect(result.images).toBeDefined();
  });

  it('handles OCR errors gracefully', async () => {
    const mockFile = new File(['image content'], 'scan.png', { type: 'image/png' });

    // Simulate worker error
    mockPostMessage.mockImplementation(() => {
      const worker = MockWorker.instance;
      if (worker?.onerror) {
        worker.onerror(new Error('Worker error'));
      }
    });

    const result = await ingestImage(mockFile);

    expect(result.texts).toBeInstanceOf(Array);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
