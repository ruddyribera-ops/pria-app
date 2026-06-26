import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import { listDiagnosticos, uploadDiagnostico, deleteDiagnostico } from './diagnosticos';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('diagnosticos API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listDiagnosticos() GETs /diagnosticos/ and returns array', async () => {
    (client.get as any).mockResolvedValue({
      data: { data: [{ id: 1, nombre: 'Diagnostico 1' }] },
    });
    const result = await listDiagnosticos();
    expect(result).toHaveLength(1);
    expect(client.get).toHaveBeenCalledWith('/diagnosticos/');
  });

  it('uploadDiagnostico() POSTs FormData and returns record', async () => {
    (client.post as any).mockResolvedValue({
      data: { data: { id: 2, estudiante: 'Test Student', tipo: 'tipo1' } },
    });
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const result = await uploadDiagnostico(mockFile, 'tipo1');
    expect((result as any).estudiante).toBe('Test Student');
    expect(client.post).toHaveBeenCalledWith(
      '/diagnosticos/upload?tipo=tipo1',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
  });

  it('uploadDiagnostico() FormData upload works with filepath in response', async () => {
    (client.post as any).mockResolvedValue({
      data: { data: { id: 3, estudiante: 'Doc Student', filename: 'doc.pdf' } },
    });
    const mockFile = new File(['pdf content'], 'doc.pdf', { type: 'application/pdf' });
    const result = await uploadDiagnostico(mockFile, 'evaluacion');
    expect((result as any).estudiante).toBe('Doc Student');
  });

  it('deleteDiagnostico(id) DELETEs with correct id', async () => {
    (client.delete as any).mockResolvedValue({});
    await deleteDiagnostico(4);
    expect(client.delete).toHaveBeenCalledWith('/diagnosticos/4');
  });

  it('listDiagnosticos() throws on network error', async () => {
    (client.get as any).mockRejectedValue(new Error('Network'));
    await expect(listDiagnosticos()).rejects.toThrow('Network');
  });

  it('uploadDiagnostico() throws on network error', async () => {
    (client.post as any).mockRejectedValue(new Error('Upload failed'));
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await expect(uploadDiagnostico(mockFile, 'tipo1')).rejects.toThrow('Upload failed');
  });
});
