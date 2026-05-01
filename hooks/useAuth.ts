'use client';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import axios from 'axios';

import apiClient from '../apiClient';
import { loginSuccess, logout } from '../redux-store/slices/userSlice';
import { useAppDispatch, useAppSelector } from '../redux-store/store';

type LoginUser = {
    userId: number;
    userName: string;
    accessToken: string;
};

type LoginResponse = {
    success?: boolean;
    data?: LoginUser;
    message?: string;
    errors?: string[];
};

export const useAuth = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, token, isAuthenticated } = useAppSelector(
        (state) => state.user,
    );
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const validateAuth = async () => {
            try {
                if (token) {
                    dispatch(loginSuccess({ user, token }));
                }
            } catch {
            } finally {
                setLoading(false);
            }
        };

        validateAuth();
    }, [dispatch, token, user]);

    const signIn = async (userName: string, password: string) => {
        try {
            setLoading(true);

            const response = await apiClient.post<LoginResponse>('/api/Auth/login', {
                userName: userName.trim(),
                password,
                platform: Platform.OS,
                deviceInfo: Platform.Version.toString(),
            });

            const raw = response.data;
            if (raw.success === false) {
                throw new Error(raw.message || 'Login failed');
            }

            const data = raw.data;
            if (!data?.accessToken) {
                throw new Error(raw.message || 'Login failed: No access token');
            }

            dispatch(
                loginSuccess({
                    user: {
                        userId: data.userId,
                        userName: data.userName,
                    },
                    token: data.accessToken,
                }),
            );

            router.replace('/App.tsx');
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const data = error.response?.data as
                    | { message?: string; errors?: string[] }
                    | undefined;
                const message =
                    data?.message ||
                    (Array.isArray(data?.errors) ? data.errors.join(', ') : undefined);

                if (message) {
                    throw new Error(message);
                }

                if (error.request) {
                    throw new Error(
                        `Cannot reach API at ${"http://187.127.133.72:5005"}. Check that the API is running and reachable from the phone. On iPhone, plain HTTP may still be blocked by Expo Go.`,
                    );
                }
            }

            throw error instanceof Error ? error : new Error('Login failed');
        } finally {
            setLoading(false);
        }
    };

    const signOut = () => {
        dispatch(logout());
        router.replace('/(auth)/login');
        if (user?.userName) {
            apiClient
                .post('/users/logout_user', { userName: user.userName })
                .catch(() => { });
        }
    };

    return {
        user,
        token,
        isAuthenticated,
        loading,
        signIn,
        signOut,
    };
};
