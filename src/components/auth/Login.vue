<script setup>
import { onBeforeMount, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore, useSessionStore, useGlobalStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const company = sessionStore.customerCompany;
const globalStore = useGlobalStore();

const loading = ref(false);
const credentials = ref({
    email: route.query?.email || '',
    password: '',
    remember_me: false
});

onBeforeMount(() => {
    globalStore.clearErrors();
});

const login = async () => {
    try {
        loading.value = true;
        await authStore.login(credentials.value);

        const url = 'Dashboard';
        router.push(url);
    } catch (e) {
        // Handle error
    } finally {
        loading.value = false;
    }
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
            <h4 class="text-3xl font-bold mb-2">Customer Portal</h4>
            <p class="text-gray-700 mb-12">Sign in to your account</p>
        </div>
        <form @submit.prevent="login">
            <div class="grid">
                <div class="mb-6 col-span-12">
                    <label class="block mb-2" for="email"> Email </label>
                    <InputField
                        variant="text"
                        id="email"
                        v-model="credentials.email"
                        class="w-full"
                    />
                </div>

                <div class="mb-4 col-span-12">
                    <label class="block mb-2" for="password"> Password </label>
                    <InputField
                        id="password"
                        variant="password"
                        v-model="credentials.password"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        :feedback="false"
                    />
                </div>
            </div>

            <div class="flex justify-between items-center pt-1 pb-[2.05rem]">
                <div class="flex items-center">
                    <InputField
                        variant="checkbox"
                        v-model="credentials.remember_me"
                        binary
                        inputId="remember"
                    />
                    <label for="remember" class="ml-2 cursor-pointer">
                        Remember me
                    </label>
                </div>
                <router-link
                    class="primary-text"
                    :to="{
                        name: 'Password Reset Request'
                    }"
                >
                    Forgot Password
                </router-link>
            </div>
            <Button
                class="w-full left-loading"
                label="Sign In"
                :disabled="loading"
                :loading="loading"
                type="submit"
            />

            <router-link
                class="primary-text flex justify-center mt-6"
                :to="{
                    name: 'Register'
                }"
            >
                Don't have an account? Sign up
            </router-link>
        </form>
    </div>
</template>
