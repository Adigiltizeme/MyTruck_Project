import { ArticlesFormProps } from "../../types/form.types";
import PhotoUploader from "../PhotoUploader";
import FormInput from "./FormInput";

export const ArticlesForm: React.FC<ArticlesFormProps> = ({ data, errors, onChange }) => {
    return (
        <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 gap-4">
                <FormInput
                    label="Nombre d'articles"
                    name="articles.nombre"
                    type="number"
                    value={String(data.articles?.nombre || '')}
                    min={0}
                    onChange={onChange}
                    error={errors.articles?.nombre}
                    required
                />
                <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">Détails des articles</label>
                    <textarea
                        name="articles.details"
                        value={data.articles?.details || ''}
                        onChange={(e) => onChange(e as any)}
                        className="mt-1 block w-full rounded-md border border-gray-300"
                        rows={4}
                    />
                </div>
                <PhotoUploader
                    onUpload={(photos) => {
                        onChange({
                            target: {
                                name: 'articles.photos',
                                value: photos
                            }
                        } as any);
                    }}
                    maxPhotos={5}
                    existingPhotos={(data.articles?.photos || []).filter((photo): photo is { url: string; file: File } => !!photo.file)}
                />
            </div>
        </div>
    );
};