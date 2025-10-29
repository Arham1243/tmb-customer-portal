<script setup>
import { onBeforeMount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, useSessionStore, useGlobalStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const globalStore = useGlobalStore();

const loading = ref(false);
const credentials = ref({
    email: '',
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
        // const url = sessionStore.consumeIntended() || 'Dashboard';
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
        <h4 class="text-3xl font-bold text-center mb-4">
            Customer Portal
        </h4>
        <p class="text-center mb-12 text-gray-700">Sign in to your account</p>
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
                    :to="{ name: 'Password Reset Request' }"
                >
                    Forgot Password
                </router-link>
            </div>
            <Button
                class="w-full left-loading"
                label="Login"
                :disabled="loading"
                :loading="loading"
                type="submit"
            />
        </form>
    </div>
</template>
