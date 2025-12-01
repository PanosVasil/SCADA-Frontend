// src/services/api.ts
import type { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  TokenResponse,
  TelemetryData,
  WriteValueRequest,
  AdminUser,
  UserListParams,
  Park
} from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

class ApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    console.warn("Unauthorized or expired token. Logging out...");
    localStorage.removeItem("access_token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  // 204 No Content (success)
  if (response.status === 204) {
    return {} as T; // return empty result
  }

  let data: any = null;

  // Try to parse JSON only if there is content
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response");
    }
  }

  if (!response.ok) {
    const detail = data?.detail || "Request failed";
    throw new Error(detail);
  }

  return data as T;
}

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  async register(data: RegisterRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<User>(response);
  }

  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetch(`${API_BASE_URL}/auth/jwt/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    return this.handleResponse<TokenResponse>(response);
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<User>(response);
  }

  async getTelemetryData(): Promise<TelemetryData> {
    const response = await fetch(`${API_BASE_URL}/data`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<TelemetryData>(response);
  }

  // ---------------- Admin endpoints ----------------
  async adminPing(): Promise<{ ok: boolean }> {
    const response = await fetch(`${API_BASE_URL}/admin/ping`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<{ ok: boolean }>(response);
  }

  async getUsers(params?: UserListParams): Promise<AdminUser[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.email) queryParams.append('q', params.email);                // 🔁 use "q" to match backend
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.is_superuser !== undefined) queryParams.append('is_superuser', params.is_superuser.toString());

    const response = await fetch(`${API_BASE_URL}/admin/users?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<AdminUser[]>(response);
  }

  async getParks(): Promise<Park[]> {
    const response = await fetch(`${API_BASE_URL}/admin/parks`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<Park[]>(response);
  }

  async assignParkToUser(userId: string, parkId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/parks/${parkId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    await this.handleResponse<void>(response);
  }

  async revokeParkFromUser(userId: string, parkId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/parks/${parkId}`, {
    method: 'DELETE',
    headers: this.getAuthHeaders(),
  });
  await this.handleResponse<void>(response);
}

  async writeValue(data: WriteValueRequest): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/write_value`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  // ---------- 🔽 NEW ADMIN HELPERS 🔽 ----------
  async getUserParks(userId: string): Promise<Park[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/parks`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<Park[]>(response);
  }

  async updateUser(
    userId: string,
    data: Partial<Pick<AdminUser, 'is_superuser' | 'is_active'>>
  ): Promise<AdminUser> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<AdminUser>(response);
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    await this.handleResponse<void>(response);
  }
}

export const apiService = new ApiService();
