<script setup>
import { ref } from 'vue';
import { useSessionStore } from '@/stores';
import { useRoute, useRouter } from 'vue-router';
const sessionStore = useSessionStore();
const currentUser = sessionStore.user;
const myCompany = sessionStore.myCompany;

const router = useRouter();
const route = useRoute();
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
const isActive = (name) => route.name === name;
</script>

<template>
    <div class="bg-white shadow-sm py-4 px-6">
        <div class="container mx-auto px-4 flex items-center justify-between">
            <div class="flex items-center space-x-8">
                <div class="font-bold text-xl text-gray-800">
                    Customer Portal
                </div>
                <nav class="flex gap-3">
                    <Button
                        icon="pi pi-file"
                        label="Invoices"
                        @click="pushRoute('Dashboard')"
                        severity="secondary"
                        text
                        :loading="busy"
                        :disabled="busy"
                        :class="{
                            'link-active': isActive('Dashboard')
                        }"
                    />

                    <Button
                        icon="pi pi-history"
                        label="History"
                        @click="pushRoute('History')"
                        severity="secondary"
                        text
                        :loading="busy"
                        :disabled="busy"
                        :class="{
                            'link-active': isActive('History')
                        }"
                    />

                    <Button
                        icon="pi pi-user"
                        label="Profile"
                        @click="pushRoute('Profile')"
                        severity="secondary"
                        text
                        :loading="busy"
                        :disabled="busy"
                        :class="{
                            'link-active': isActive('Profile')
                        }"
                    />
                </nav>
            </div>

            <div class="flex items-center space-x-4">
                <div class="text-right hidden sm:block">
                    <div class="font-medium text-gray-800">
                        {{ currentUser.name }}
                    </div>
                    <div class="text-sm text-gray-500">
                        {{ currentUser.email }}
                    </div>
                </div>
                <Button
                    icon="pi pi-sign-out"
                    label="Sign Out"
                    @click="logout"
                    severity="secondary"
                    text
                    :loading="busy"
                    :disabled="busy"
                />
            </div>
        </div>
    </div>
    <div class="text-center mt-10 font-bold text-2xl">
        {{ myCompany.name }}
    </div>
</template>
