import Tesseract from 'tesseract.js';

export {};

self.onmessage = async (event: MessageEvent) => {
  const { imageDataUrl, lang, taskId } = event.data;

  try {
    // Send initial progress
    self.postMessage({ type: 'progress', taskId, status: 'loading tesseract', progress: 0 });

    const { data } = await Tesseract.recognize(imageDataUrl, lang ?? 'eng+spa', {
      logger: (m) => {
        // Translate Tesseract logger events to worker postMessage progress updates
        self.postMessage({
          type: 'progress',
          taskId,
          status: m.status ?? 'processing',
          progress: m.progress ?? 0,
        });
      },
    });

    self.postMessage({
      type: 'done',
      taskId,
      text: data.text,
      confidence: data.confidence,
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      taskId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};