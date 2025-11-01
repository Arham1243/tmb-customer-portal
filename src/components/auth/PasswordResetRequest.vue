<script setup>
import { onBeforeMount, ref } from 'vue';
import { useAuthStore, useGlobalStore, useSessionStore } from '@/stores';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const globalStore = useGlobalStore();
const company = sessionStore.customerCompany;
const loading = ref(false);
const email = ref(null);

onBeforeMount(() => {
    globalStore.clearErrors();
});

const handleSubmit = async () => {
    try {
        loading.value = true;
        const res = await authStore.forgotPassword({
            email: email.value
        });
        if (res?.status === true) {
            email.value = '';
            globalStore.clearErrors();
        }
    } catch (e) {
        // Handle error
    } finally {
        loading.value = false;
    }
};
const goBack = () => {
    router.push({ name: 'Login' });
};
</script>
<template>
    <div>
        <div class="text-center">
            <img
                :src="company?.logo_url"
                :alt="company?.name"
                class="mx-auto company-logo mb-2"
            />
            <h2 class="text-lg !text-gray-600 font-bold mb-2">
                {{ company?.name }}
            </h2>
            <h4 class="text-3xl font-bold mb-2">Forgot Password</h4>
            <p class="text-gray-700 mb-12">
                Enter your email address and we'll send you a link to reset your
                password.
            </p>
        </div>
        <form @submit.prevent="handleSubmit">
            <div class="grid mb-3">
                <div class="mb-6 col-span-12">
                    <label for="email" class="block mb-2">Email</label>
                    <InputField
                        id="email"
                        v-model="email"
                        variant="text"
                        class="w-full"
                    />
                </div>
            </div>

            <Button
                class="w-full left-loading mb-4"
                label="Continue"
                :disabled="!email || loading"
                :loading="loading"
                type="submit"
            />
            <Button
                variant="outlined"
                class="w-full left-loading"
                label="Back to Login"
                :disabled="loading"
                @click="goBack"
                type="button"
            />
        </form>
    </div>
</template>
