import { defineStore } from 'pinia';
import { AuthService } from '@/services';
import { useGlobalStore, useSessionStore } from '@/stores';

export const useAuthStore = defineStore('AuthStore', () => {
    const globalStore = useGlobalStore();
    const sessionStore = useSessionStore();

    const login = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await AuthService.login(payload);
            sessionStore.startUserSession(res.data.data);
            return res.data;
        });
    };

    const forgotPassword = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await AuthService.forgotPassword(payload);
            globalStore.showSuccess(
                'Password link sent successfully',
                'Please Check your email for the reset link'
            );
            return res.data;
        });
    };

    const resetPassword = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await AuthService.resetPassword(payload);
            globalStore.showSuccess(
                'Password changed successfully',
                'Your password has been changed successfully'
            );
            return res.data;
        });
    };

    const setupPassword = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await AuthService.setupPassword(payload);
            sessionStore.startUserSession(res.data.data);
            return res.data;
        });
    };

    const logout = async () => {
        const res = await AuthService.logout();
        const sessionStore = useSessionStore();
        sessionStore.clearSessionState();
        return res.data;
    };

    return {
        login,
        logout,
        forgotPassword,
        resetPassword,
        setupPassword
    };
});
