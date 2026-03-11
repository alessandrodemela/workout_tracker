export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const fetcher = (url) => fetch(url).then(res => res.json());

export const checkHealth = async () => {
    try {
        const res = await fetch(`${API_URL}/health`);
        return res.ok;
    } catch {
        return false;
    }
};
