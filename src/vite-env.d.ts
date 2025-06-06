/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_AIRTABLE_TOKEN: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}