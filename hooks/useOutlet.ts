'use client';
import { useState, useCallback } from 'react';
import axios from 'axios';
import apiClient from '../apiClient';
import { Outlet } from '../types/types';

type OutletResponse = {
    success?: boolean;
    data?: Outlet[];
    message?: string;
    errors?: string[];
};

export const useOutlet = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [error, setError] = useState<string | null>(null);

    const getOutlets = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.get<OutletResponse>('/api/OutletMaster');

            const raw = response.data;
            console.log('Fetched Outlets from API:', raw);

            let data: Outlet[] = [];
            if (Array.isArray(raw)) {
                data = raw;
            } else if (raw && typeof raw === 'object') {
                if (raw.success === false) {
                    throw new Error(raw.message || 'Failed to fetch outlets');
                }
                data = raw.data || [];
            }
            setOutlets(data);
            return data;
        } catch (err: unknown) {
            let message = 'Failed to fetch outlets';
            if (axios.isAxiosError(err)) {
                const data = err.response?.data as
                    | { message?: string; errors?: string[] }
                    | undefined;
                message =
                    data?.message ||
                    (Array.isArray(data?.errors) ? data.errors.join(', ') : err.message);
            } else if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        outlets,
        loading,
        error,
        getOutlets,
    };
};
