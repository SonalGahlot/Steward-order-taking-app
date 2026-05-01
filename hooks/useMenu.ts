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
            // 1. Fetch basic menu list
            const response = await apiClient.get<MenuByOutletItem[]>(`/api/MenuMaster/outlet/${outletId}`);
            const raw = response.data;
            const menuData = Array.isArray(raw) ? raw : [];

            // 2. Fetch categories, types, and bulk mappings (Addons, Variants, Modifiers)
            // Note: If /api/MenuModifierMapping doesn't exist, we fallback to empty array.
            const [catRes, typeRes, addonsRes, variantsRes, modifiersRes] = await Promise.allSettled([
                apiClient.get<CategoryMaster[]>('/api/MenuCategoryMaster'),
                apiClient.get<MenuTypeMaster[]>('/api/MenuTypeMaster'),
                apiClient.get<any[]>('/api/MenuAddOnMapping'),
                apiClient.get<any[]>('/api/MenuVariant'),
                apiClient.get<any[]>('/api/ModifierMaster') // Using ModifierMaster as fallback, or /api/MenuModifierMapping if it existed
            ]);
            
            const catData = catRes.status === 'fulfilled' && Array.isArray(catRes.value.data) ? catRes.value.data : [];
            const typeData = typeRes.status === 'fulfilled' && Array.isArray(typeRes.value.data) ? typeRes.value.data : [];
            
            const allAddons = addonsRes.status === 'fulfilled' && Array.isArray(addonsRes.value.data) ? addonsRes.value.data : [];
            const allVariants = variantsRes.status === 'fulfilled' && Array.isArray(variantsRes.value.data) ? variantsRes.value.data : [];
            const allModifiers = modifiersRes.status === 'fulfilled' && Array.isArray(modifiersRes.value.data) ? modifiersRes.value.data : [];

            // Group addons by parentMenuId
            const addonsByMenu = allAddons.reduce((acc, curr) => {
                if (curr.isActive) {
                    if (!acc[curr.parentMenuId]) acc[curr.parentMenuId] = [];
                    acc[curr.parentMenuId].push(curr);
                }
                return acc;
            }, {} as Record<number, any[]>);

            // Group variants by menuId
            const variantsByMenu = allVariants.reduce((acc, curr) => {
                if (curr.isActive) {
                    if (!acc[curr.menuId]) acc[curr.menuId] = [];
                    acc[curr.menuId].push(curr);
                }
                return acc;
            }, {} as Record<number, any[]>);

            // Group modifiers (If no mapping is returned, this might need adjustment based on backend)
            // If modifiers are global, we might just attach all of them. For now, we leave modifiers empty 
            // and rely on lazy loading if needed, or if the API returns a menuId mapping, we'd use it here.
            const modifiersByMenu = allModifiers.reduce((acc, curr) => {
                // If the API unexpectedly returns menuId, we use it. Otherwise, we don't map them upfront.
                if (curr.isActive && curr.menuId) {
                    if (!acc[curr.menuId]) acc[curr.menuId] = [];
                    acc[curr.menuId].push(curr);
                }
                return acc;
            }, {} as Record<number, any[]>);

            // 3. Map bulk data to menus
            const enrichedMenus = menuData.map(item => ({
                ...item,
                addOns: addonsByMenu[item.id] || [],
                variations: variantsByMenu[item.id] || [],
                modifiers: modifiersByMenu[item.id] || []
            }));

            // Update state immediately to show the enriched menu
            setMenus(enrichedMenus);
            setCategories(catData);
            setMenuTypes(typeData);
            setLoading(false);

            // Background enrichment loop is REMOVED since we load mappings in bulk!

        } catch (err) {
            console.error('Failed to fetch menus, categories, or types', err);
            setError('Failed to load menu data.');
            setLoading(false);
        }
    }, [outletId]);

    const fetchItemDetails = useCallback(async (itemId: number) => {
        // If an item still needs details (e.g. modifiers weren't mapped in bulk), fetch them lazily
        try {
            const modifiersRes = await apiClient.get<any[]>(`/api/MenuMaster/${itemId}/modifiers`);

            const details = {
                modifiers: Array.isArray(modifiersRes.data) ? modifiersRes.data.filter((x: any) => x.isActive) : [],
                modifiersLoaded: true
            };

            setMenus(prev => prev.map(item => 
                item.id === itemId ? { ...item, ...details } : item
            ));

            return details;
        } catch (e) {
            console.error(`Failed to fetch details for item ${itemId}`, e);
            return null;
        }
    }, []);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    return { menus, categories, menuTypes, loading, error, refetch: fetchMenu, fetchItemDetails };
}
