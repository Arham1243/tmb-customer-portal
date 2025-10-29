<script setup>
import { ref } from 'vue';
import { useSessionStore, useAuthStore } from '@/stores';
import { useRouter } from 'vue-router';
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const currentUser = sessionStore.user;

const router = useRouter();
const busy = ref(false);
const logout = async () => {
    try {
        busy.value = true;
        await authStore.logout();
    } finally {
        sessionStore.clearSessionState();
        pushRoute('Login');
        busy.value = false;
    }
};

const pushRoute = (name) => {
    router.push({ name });
};
</script>

<template>
    custom header {{ currentUser.name }}

    <Button @click="logout" :loading="busy" :disabled="busy">Logout</Button>
</template>

<style lang="scss" scoped></style>
