import { computed } from 'vue';
import { useSessionStore } from '@/stores';

export function useUserRole() {
    const sessionStore = useSessionStore();

    const isAdmin = computed(() => sessionStore.userRole?.is_admin);
    const isApprover = computed(() => sessionStore.userRole?.is_approver);

    return {
        isAdmin,
        isApprover
    };
}
