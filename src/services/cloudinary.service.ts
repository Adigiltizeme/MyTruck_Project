import { Cloudinary } from '@cloudinary/url-gen';

export class CloudinaryService {
    private cloudinary: Cloudinary;

    constructor() {
        this.cloudinary = new Cloudinary({
            cloud: {
                cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
                apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
                apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET
            }
        });
    }

    async uploadImage(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'my_truck_images');
        formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
        formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY);
    
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
    
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Erreur Cloudinary:', errorData);
                throw new Error(errorData.error?.message || 'Erreur upload');
            }
    
            const data = await response.json();
            return {
                url: data.secure_url,
                filename: file.name
            };
        } catch (error) {
            console.error('Erreur upload:', error);
            throw error;
        }
    }
}

