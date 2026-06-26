import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import { listBlocks, createBlock, updateBlock, deleteBlock } from './blocks';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('blocks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listBlocks() returns array from response.data', async () => {
    (client.get as any).mockResolvedValue({
      data: { data: [{ id: 1, hora_inicio: '08:00', hora_fin: '09:00' }] },
    });
    const result = await listBlocks();
    expect(result).toHaveLength(1);
    expect((result[0] as any).hora_inicio).toBe('08:00');
    expect(client.get).toHaveBeenCalledWith('/blocks/');
  });

  it('listBlocks() returns array from response.data.data (double-wrapped)', async () => {
    (client.get as any).mockResolvedValue({
      data: {
        data: [{ id: 2, hora_inicio: '09:00', hora_fin: '10:00' }],
      },
    });
    const result = await listBlocks();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('createBlock() POSTs correct payload', async () => {
    (client.post as any).mockResolvedValue({
      data: { data: { id: 3, hora_inicio: '08:00', hora_fin: '09:00' } },
    });
    const blockData = { teacher_code: 'T1', dia: 'LUNES', hora_inicio: '08:00', hora_fin: '09:00', tipo: 'normal' };
    const result = await createBlock(blockData as any);
    expect((result as any).hora_inicio).toBe('08:00');
    expect(client.post).toHaveBeenCalledWith('/blocks/', blockData);
  });

  it('updateBlock(id, data) PUTs with correct id', async () => {
    (client.put as any).mockResolvedValue({
      data: { data: { id: 5, hora_inicio: '10:00', hora_fin: '11:00' } },
    });
    const updateData = { hora_inicio: '10:00' };
    const result = await updateBlock(5, updateData as any);
    expect(result.id).toBe(5);
    expect(client.put).toHaveBeenCalledWith('/blocks/5', updateData);
  });

  it('deleteBlock(id) DELETEs with correct id', async () => {
    (client.delete as any).mockResolvedValue({});
    await deleteBlock(7);
    expect(client.delete).toHaveBeenCalledWith('/blocks/7');
  });

  it('listBlocks() throws on network error (not wrapped)', async () => {
    (client.get as any).mockRejectedValue(new Error('Network'));
    await expect(listBlocks()).rejects.toThrow('Network');
  });
});
