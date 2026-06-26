import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import { getScheduleByDay } from './schedule';

vi.mock('./client', () => ({
  default: { get: vi.fn() },
}));

describe('getScheduleByDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns bloques from response.data.bloques', async () => {
    (client.get as any).mockResolvedValue({
      data: { teacher_code: 'T', dia: 'LUNES', bloques: [{ id: 1, hora_inicio: '08:00' }] },
    });
    const r = await getScheduleByDay('T', 'LUNES');
    expect(r).toHaveLength(1);
    expect(r[0].hora_inicio).toBe('08:00');
  });

  it('returns [] when bloques is empty', async () => {
    (client.get as any).mockResolvedValue({ data: { teacher_code: 'T', dia: 'LUNES', bloques: [] } });
    const r = await getScheduleByDay('T', 'LUNES');
    expect(r).toEqual([]);
  });

  it('returns [] on network error (does not throw)', async () => {
    (client.get as any).mockRejectedValue(new Error('Network'));
    const r = await getScheduleByDay('T', 'LUNES');
    expect(r).toEqual([]);
  });
});
