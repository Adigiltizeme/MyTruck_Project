const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Client API centralisé avec gestion ngrok
export class ApiClient {
  private static getHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...additionalHeaders,
    };
  }

  static async get<T>(endpoint: string, token?: string): Promise<T> {
    const headers = this.getHeaders(token ? { 'Authorization': `Bearer ${token}` } : {});
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`GET ${endpoint}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async post<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const headers = this.getHeaders(token ? { 'Authorization': `Bearer ${token}` } : {});
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`POST ${endpoint}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async put<T>(endpoint: string, data: any, token?: string): Promise<T> {
    const headers = this.getHeaders(token ? { 'Authorization': `Bearer ${token}` } : {});
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`PUT ${endpoint}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  static async delete<T>(endpoint: string, token?: string): Promise<T> {
    const headers = this.getHeaders(token ? { 'Authorization': `Bearer ${token}` } : {});
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`DELETE ${endpoint}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}