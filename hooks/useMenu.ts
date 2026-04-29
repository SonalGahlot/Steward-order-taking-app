import { useState, useEffect, useCallback } from 'react';
import apiClient from '../apiClient';
import type { MenuByOutletItem, CategoryMaster, MenuTypeMaster } from '../types/types';

export function useMenu(outletId: number | undefined) {
    const [menus, setMenus] = useState<MenuByOutletItem[]>([]);
    const [categories, setCategories] = useState<CategoryMaster[]>([]);
    const [menuTypes, setMenuTypes] = useState<MenuTypeMaster[]>([]);
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

            const enrichedMenus = await Promise.all(
              data.map(async (item) => {
                try {
                  const [addonsRes, variantsRes, modifiersRes] = await Promise.all([
                    apiClient.get<any[]>(`/api/MenuMaster/${item.id}/addons`),
                    apiClient.get<any[]>(`/api/MenuMaster/${item.id}/variants`),
                    apiClient.get<any[]>(`/api/MenuMaster/${item.id}/modifiers`),
                  ]);

                  return {
                    ...item,
                    addOns: Array.isArray(addonsRes.data) ? addonsRes.data.filter((x: any) => x.isActive) : [],
                    variations: Array.isArray(variantsRes.data) ? variantsRes.data.filter((x: any) => x.isActive) : [],
                    modifiers: Array.isArray(modifiersRes.data) ? modifiersRes.data.filter((x: any) => x.isActive) : [],
                  };
                } catch (e) {
                  return {
                    ...item,
                    addOns: [],
                    variations: [],
                    modifiers: [],
                  };
                }
              })
            );

            setMenus(enrichedMenus);
            console.log('Menus data (enriched):', enrichedMenus);

            const catResponse = await apiClient.get<CategoryMaster[]>('/api/MenuCategoryMaster');
            const catRaw = catResponse.data;
            const catData = Array.isArray(catRaw) ? catRaw : [];
            setCategories(catData);
            console.log('Categories data:', catData);

            const typeResponse = await apiClient.get<MenuTypeMaster[]>('/api/MenuTypeMaster');
            const typeRaw = typeResponse.data;
            const typeData = Array.isArray(typeRaw) ? typeRaw : [];
            setMenuTypes(typeData);
            console.log('MenuTypes data:', typeData);

        } catch (err) {
            console.error('Failed to fetch menus, categories, or types', err);
            setError('Failed to load menu data.');
        } finally {
            setLoading(false);
        }
    }, [outletId]);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    return { menus, categories, menuTypes, loading, error, refetch: fetchMenu };
}
