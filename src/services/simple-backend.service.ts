import { CommandeMetier } from '../types/business.types';

export class SimpleBackendService {
    private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = localStorage.getItem('authToken');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> | undefined)
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    async getCommandes(): Promise<CommandeMetier[]> {
        const result = await this.request<{ data: CommandeMetier[] }>('/commandes');
        return result.data || [];
    }

    async getCommande(id: string): Promise<CommandeMetier> {
        return this.request<CommandeMetier>(`/commandes/${id}`);
    }

    async createCommande(commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        return this.request<CommandeMetier>('/commandes', {
            method: 'POST',
            body: JSON.stringify(commande)
        });
    }

    async updateCommande(id: string, commande: Partial<CommandeMetier>): Promise<CommandeMetier> {
        return this.request<CommandeMetier>(`/commandes/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(commande)
        });
    }
}

export const simpleBackendService = new SimpleBackendService();