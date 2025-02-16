import { Map, Marker } from "react-map-gl";

export const MapComponent: React.FC<{
    positions: Array<{latitude: number, longitude: number, label?: string}>,
    isVisible: boolean
}> = ({ positions, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="h-96 w-full">
            <Map
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                initialViewState={{
                    longitude: positions[0]?.longitude || 2.3488,
                    latitude: positions[0]?.latitude || 48.8534,
                    zoom: 12
                }}
                style={{width: '100%', height: '100%'}}
                mapStyle="mapbox://styles/mapbox/streets-v11"
            >
                {positions.map((pos, idx) => (
                    <Marker
                        key={idx}
                        longitude={pos.longitude}
                        latitude={pos.latitude}
                    >
                        <div className="text-xs bg-white p-1 rounded shadow">
                            {pos.label || 'Chauffeur'}
                        </div>
                    </Marker>
                ))}
            </Map>
        </div>
    );
};