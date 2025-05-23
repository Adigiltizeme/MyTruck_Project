export const CRENEAUX_LIVRAISON = [
    "07h-09h", "08h-10h", "09h-11h", "10h-12h",
    "11h-13h", "12h-14h", "13h-15h", "14h-16h",
    "15h-17h", "16h-18h", "17h-19h", "18h-20h"
];

export type VehiculeType = 
    // | "3M3 (Utilitaire 150kg, 180x125x180cm)"
    // | "6M3 (Camionnette 300kg, 240x169x138cm)"
    // | "10M3 (Camionnette 1000kg, 308x207x176cm)"
    // | "20M3 (Avec hayon 1000kg, 420, 207, 230cm)";
    | "1M3 (Utilitaire 150kg, 100x100x100cm)"
    | "6M3 (Camionnette 300kg, 260x160x125cm)"
    | "10M3 (Camionnette 800kg, 310x178x190cm)"
    | "20M3 (Avec hayon 750kg, 410, 200, 210cm)";

export const VEHICULES: Record<string, string> = {
    // "3M3 (Utilitaire 150kg, 180x125x180cm)": "3M3",
    // "6M3 (Camionnette 300kg, 240x169x138cm)": "6M3",
    // "10M3 (Camionnette 1000kg, 308x207x176cm)": "10M3",
    // "20M3 (Avec hayon 1000kg, 420, 207, 230cm)": "20M3"
    "1M3 (Utilitaire 150kg, 100x100x100cm)": "1M3",
    "6M3 (Camionnette 300kg, 260x160x125cm)": "6M3",
    "10M3 (Camionnette 800kg, 310x178x190cm)": "10M3",
    "20M3 (Avec hayon 750kg, 410, 200, 210cm)": "20M3"
};
