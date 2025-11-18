<script setup>
import { onBeforeMount, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore, useSessionStore, useGlobalStore } from '@/stores';
import { RecaptchaV2 } from 'vue3-recaptcha-v2';
const APP_URL = `${import.meta.env.VITE_APP_URL}`;

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

const showEula = ref(false);
const showPrivacy = ref(false);

onBeforeMount(() => {
    globalStore.clearErrors();
});

const login = async () => {
    if (!recaptchaToken.value) {
        globalStore.showError('reCAPTCHA', 'Please complete the reCAPTCHA');
        return;
    }

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

const recaptchaToken = ref('');
const handleErrorCallback = () => {
    globalStore.showError(
        'reCAPTCHA',
        'Captcha failed to load. Please refresh.'
    );
};
const handleExpiredCallback = () => {
    recaptchaToken.value = '';
    globalStore.showError('reCAPTCHA', 'Captcha expired, Please refresh.');
};
const handleLoadCallback = (token) => {
    recaptchaToken.value = token;
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

            <div class="pb-5">
                <RecaptchaV2
                    @error-callback="handleErrorCallback"
                    @expired-callback="handleExpiredCallback"
                    @load-callback="handleLoadCallback"
                />
            </div>

            <Button
                class="w-full left-loading"
                label="Sign In"
                :disabled="loading || !recaptchaToken"
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

            <div
                class="text-center text-sm font-base text-gray-500 mt-3 leading-6"
            >
                By signing in, you accept the
                <span
                    @click="showEula = true"
                    class="font-semibold cursor-pointer primary-text"
                >
                    End-User License Agreement
                </span>
                and
                <span
                    @click="showPrivacy = true"
                    class="font-semibold cursor-pointer primary-text"
                >
                    Privacy Policy
                </span>
            </div>
        </form>
    </div>

    <!-- EULA Dialog -->
    <Dialog
        v-model:visible="showEula"
        modal
        header="End-User License Agreement"
        :style="{ width: '50vw', maxHeight: '80vh' }"
    >
        <iframe
            :src="`${APP_URL}/eula`"
            class="w-full h-[50vh]"
            frameborder="0"
        ></iframe>
        <template #footer>
            <Button label="Close" @click="showEula = false" />
        </template>
    </Dialog>

    <!-- Privacy Policy Dialog -->
    <Dialog
        v-model:visible="showPrivacy"
        modal
        header="Privacy Policy"
        :style="{ width: '50vw', maxHeight: '80vh' }"
    >
        <iframe
            :src="`${APP_URL}/privacy-policy`"
            class="w-full h-[50vh]"
            frameborder="0"
        ></iframe>
        <template #footer>
            <Button label="Close" @click="showPrivacy = false" />
        </template>
    </Dialog>
</template>
