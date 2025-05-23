import axios from 'axios';

export class CloudinaryService {
    private cloudName: string;
    private uploadPreset: string;
    // private apiKey: string;

    constructor() {
        this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
        this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string || 'my_truck_images';
        // this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY as string;
    }

    /**
     * Vérifie si une URL est une URL Airtable
     * @param url URL à vérifier
     * @returns true si c'est une URL Airtable
     */
    isAirtableUrl(url: string): boolean {
        return typeof url === 'string' && (
            url.includes('airtableusercontent.com') ||
            url.includes('airtable.com') ||
            url.includes('dl.airtable.com')
        );
    }

    /**
     * Upload une image vers Cloudinary
     * @param file Fichier image à uploader
     * @returns Résultat de l'upload contenant l'URL et autres métadonnées
     */
    async uploadImage(file: File): Promise<{ url: string; filename: string }> {
        try {
            console.log(`Début de l'upload vers Cloudinary: ${file.name} (${file.size} octets)`);
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);

            // Ne pas inclure les secrets API dans les requêtes client-side
            // Utiliser uniquement upload_preset qui est configuré côté Cloudinary

            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            return {
                url: response.data.secure_url,
                filename: response.data.public_id || file.name
            };
        } catch (error) {
            console.error('Erreur lors de l\'upload vers Cloudinary:', error);

            // Journaliser plus de détails sur l'erreur pour le débogage
            if (axios.isAxiosError(error) && error.response) {
                console.error('Détails de l\'erreur Cloudinary:', error.response.data);
            }

            throw new Error('Erreur lors de l\'upload de l\'image. Veuillez réessayer.');
        }
    }

    /**
     * Upload un fichier (PDF, etc.) vers Cloudinary
     * @param file Fichier Blob à uploader
     * @param fileName Nom du fichier pour identification
     * @returns Résultat de l'upload
     */
    async uploadFile(file: Blob, fileName: string): Promise<{ url: string; filename: string }> {
        try {
            // Convertir le Blob en File avec un nom de fichier spécifique
            const formData = new FormData();
            const fileObj = new File([file], fileName, { type: file.type || 'application/octet-stream' });

            formData.append('file', fileObj);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('resource_type', 'auto');

            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            return {
                url: response.data.secure_url,
                filename: response.data.public_id || fileName
            };
        } catch (error) {
            console.error('Erreur lors de l\'upload du fichier vers Cloudinary:', error);
            throw new Error('Erreur lors de l\'upload du fichier. Veuillez réessayer.');
        }
    }

    /**
     * Upload une image depuis une URL externe vers Cloudinary
     * @param url URL de l'image à uploader
     * @returns Résultat de l'upload
     */
    async uploadFromUrl(url: string): Promise<{ url: string; filename: string }> {
        try {
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                {
                    file: url,
                    upload_preset: this.uploadPreset
                }
            );

            return {
                url: response.data.secure_url,
                filename: response.data.public_id
            };
        } catch (error) {
            console.error('Erreur lors de l\'upload depuis URL vers Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Vérifie si une URL est une URL Cloudinary
     */
    isCloudinaryUrl(url: string): boolean {
        return typeof url === 'string' && url.includes(`res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}`);
    }
}

