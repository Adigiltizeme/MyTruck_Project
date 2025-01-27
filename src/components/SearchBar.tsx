import { useState } from "react";

export const SearchBar = () => {
    const [search, setSearch] = useState("");
    return (
        <div className="flex gap-4 items-center mb-4">
            <div className="relative flex-1">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full px-4 py-2 border rounded-lg"
                />
                <button
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setSearch("")}
                >
                    ×
                </button>
            </div>
            <select className="border rounded-lg px-3 py-2">
                <option value="numeroCommande">Numéro</option>
                <option value="client">Client</option>
                <option value="magasin">Magasin</option>
                <option value="chauffeur">Chauffeur</option>
                <option value="statut">Statut</option>
            </select>
        </div>
    );
};