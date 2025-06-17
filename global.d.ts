declare global {
    interface Window {
        process: {
            env: {
                [key: string]: string | undefined;
                VITE_API_URL?: string;
                NODE_ENV?: string;
            }
        }
    }
}

export { };