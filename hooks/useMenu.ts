import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import type { MenuByOutletItem, CategoryMaster } from '../types/types';

export function useMenu(outletId: number | undefined) {
    const [menus, setMenus] = useState<MenuByOutletItem[]>([]);
    const [categories, setCategories] = useState<CategoryMaster[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMenu = useCallback(async () => {
        if (!outletId) return;
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<MenuByOutletItem[]>(`/api/MenuMaster/outlet/${outletId}`);
            const raw = response.data;
            const data = Array.isArray(raw) ? raw : [];
            setMenus(data);
            console.log('Menus data:', data);

            const catResponse = await apiClient.get<CategoryMaster[]>('/api/MenuCategoryMaster');
            const catRaw = catResponse.data;
            const catData = Array.isArray(catRaw) ? catRaw : [];
            setCategories(catData);
            console.log('Categories data:', catData);

        } catch (err) {
            console.error('Failed to fetch menus or categories', err);
            setError('Failed to load menu data.');
        } finally {
            setLoading(false);
        }
    }, [outletId]);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    return { menus, categories, loading, error, refetch: fetchMenu };
}
