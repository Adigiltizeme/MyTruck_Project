import { apiService } from './api.service';

export interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'NEW_FEATURE' | 'IMPROVEMENT' | 'MAINTENANCE' | 'INFO';
    icon?: string;
    ctaText?: string;
    ctaLink?: string;
    targetRoles: string[];
    startDate: string;
    endDate: string;
    priority: number;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAnnouncementDto {
    title: string;
    message: string;
    type: 'NEW_FEATURE' | 'IMPROVEMENT' | 'MAINTENANCE' | 'INFO';
    icon?: string;
    ctaText?: string;
    ctaLink?: string;
    targetRoles: string[];
    startDate: string;
    endDate: string;
    priority?: number;
    isActive?: boolean;
}

export type UpdateAnnouncementDto = Partial<CreateAnnouncementDto>;

class AnnouncementService {
    /**
     * Get active announcements for current user
     */
    async getActiveAnnouncements(): Promise<Announcement[]> {
        return apiService.get<Announcement[]>('/announcements');
    }

    /**
     * Get all announcements (admin only)
     */
    async getAllAnnouncements(): Promise<Announcement[]> {
        return apiService.get<Announcement[]>('/announcements/admin/all');
    }

    /**
     * Get a single announcement by ID
     */
    async getAnnouncementById(id: string): Promise<Announcement> {
        return apiService.get<Announcement>(`/announcements/${id}`);
    }

    /**
     * Create a new announcement
     */
    async createAnnouncement(dto: CreateAnnouncementDto): Promise<Announcement> {
        return apiService.post<Announcement>('/announcements', dto);
    }

    /**
     * Update an announcement
     */
    async updateAnnouncement(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
        return apiService.patch<Announcement>(`/announcements/${id}`, dto);
    }

    /**
     * Delete an announcement
     */
    async deleteAnnouncement(id: string): Promise<void> {
        await apiService.delete(`/announcements/${id}`);
    }

    /**
     * Toggle announcement active status
     */
    async toggleActive(id: string): Promise<Announcement> {
        return apiService.patch<Announcement>(`/announcements/${id}/toggle-active`, {});
    }
}

export const announcementService = new AnnouncementService();