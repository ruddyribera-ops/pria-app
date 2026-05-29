import type { LoginRequest, TokenResponse, UserInfo } from '../types';
import client from './client';

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const response = await client.post<{ data: TokenResponse }>('/auth/login', data);
  return response.data.data;
}

export async function getMe(): Promise<UserInfo> {
  const response = await client.get<{ data: UserInfo }>('/auth/me');
  return response.data.data;
}