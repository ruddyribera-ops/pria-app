import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import { listUsers, createUser, updateUser, deleteUser } from './users';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listUsers() calls /admin/users (NOT /users/)', async () => {
    (client.get as any).mockResolvedValue({
      data: { data: [{ id: 1, nombre: 'Usuario 1' }] },
    });
    const result = await listUsers();
    expect(result).toHaveLength(1);
    expect(client.get).toHaveBeenCalledWith('/admin/users/');
    // Verify it does NOT call /users/
    expect(client.get).not.toHaveBeenCalledWith('/users/');
  });

  it('createUser() POSTs correct shape (usuario, not username)', async () => {
    (client.post as any).mockResolvedValue({
      data: { data: { id: 5, nombre: 'Nuevo', username: 'nuevouser' } },
    });
    const userData = { username: 'nuevouser', nombre: 'Nuevo', role: 'docente' as const };
    const result = await createUser(userData as any);
    expect(result.nombre).toBe('Nuevo');
    // Verify payload translates username -> usuario
    expect(client.post).toHaveBeenCalledWith(
      '/admin/users/',
      expect.objectContaining({ usuario: 'nuevouser' }),
    );
  });

  it('updateUser(id, data) PUTs with correct id', async () => {
    (client.put as any).mockResolvedValue({
      data: { data: { id: 3, nombre: 'Actualizado' } },
    });
    const updateData = { nombre: 'Actualizado' };
    const result = await updateUser(3, updateData as any);
    expect(result.nombre).toBe('Actualizado');
    expect(client.put).toHaveBeenCalledWith('/admin/users/3', updateData);
  });

  it('deleteUser(id) DELETEs with correct id', async () => {
    (client.delete as any).mockResolvedValue({});
    await deleteUser(7);
    expect(client.delete).toHaveBeenCalledWith('/admin/users/7');
  });

  it('listUsers() throws on network error', async () => {
    (client.get as any).mockRejectedValue(new Error('Network'));
    await expect(listUsers()).rejects.toThrow('Network');
  });

  it('createUser() throws on network error', async () => {
    (client.post as any).mockRejectedValue(new Error('Network'));
    await expect(createUser({ username: 'test', nombre: 'Test' } as any)).rejects.toThrow('Network');
  });
});
