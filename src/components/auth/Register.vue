<script setup>
import { onBeforeMount, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore, useSessionStore, useGlobalStore } from '@/stores';
import { RecaptchaV2 } from 'vue3-recaptcha-v2';
import { getDeviceFingerprint, getDeviceInfo } from '@/utils/deviceFingerprint';
const APP_URL = `${import.meta.env.VITE_APP_URL}`;

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const globalStore = useGlobalStore();

const loading = ref(false);
const showEula = ref(false);
const showPrivacy = ref(false);
const acceptPolicies = ref(false);
const credentials = ref({
    email: route.query?.email || '',
    password: '',
    password_confirmation: ''
});

const rules = ref({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
});

onBeforeMount(() => {
    globalStore.clearErrors();
});

const validatePassword = () => {
    const password = credentials.value.password;

    rules.value.minLength = password.length >= 8;
    rules.value.uppercase = /[A-Z]/.test(password);
    rules.value.lowercase = /[a-z]/.test(password);
    rules.value.number = /[0-9]/.test(password);
    rules.value.symbol = /[@$!%*#?&]/.test(password);
};

const isPasswordValid = computed(
    () =>
        rules.value.minLength &&
        rules.value.uppercase &&
        rules.value.lowercase &&
        rules.value.number &&
        rules.value.symbol
);

const register = async () => {
    if (!recaptchaToken.value) {
        globalStore.showError('reCAPTCHA', 'Please complete the reCAPTCHA');
        return;
    }

    try {
        loading.value = true;

        const deviceFingerprint = getDeviceFingerprint();
        const deviceInfo = getDeviceInfo();

        const payload = {
            ...credentials.value,
            device_fingerprint: deviceFingerprint,
            device_info: deviceInfo
        };

        const response = await authStore.register(payload);

        // Check if OTP verification is required
        if (response?.challenge === 'OTP_REQUIRED') {
            sessionStore.setEmail(credentials.value.email);
            router.push({
                name: 'CodeVerification',
                query: {
                    session: response.session
                }
            });
            return;
        }

        router.push({ name: 'SelectCustomer' });
    } catch (e) {
        // Other errors are handled by globalStore
    } finally {
        loading.value = false;
    }
};

// recaptcha
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
            <h4 class="text-3xl font-bold mb-2">Customer Portal</h4>
            <p class="text-gray-700 mb-12">Create your account</p>
        </div>
        <form @submit.prevent="register">
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
                        @input="validatePassword"
                        id="password"
                        variant="password"
                        v-model="credentials.password"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        :feedback="false"
                    />
                </div>

                <div class="mb-4 col-span-12">
                    <label class="block mb-2" for="password_confirmation">
                        Confirm Password
                    </label>
                    <InputField
                        @input="validatePassword"
                        id="password_confirmation"
                        variant="password"
                        v-model="credentials.password_confirmation"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        :feedback="false"
                    />
                </div>

                <div class="mb-6 col-span-12 mt-3">
                    <label class="font-semibold mb-4 block"
                        >Password must contain the following:</label
                    >
                    <div class="space-y-1">
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.minLength,
                                    invalid: !rules.minLength
                                }
                            ]"
                        >
                            <span class="pl-3">At least 8 characters</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.uppercase,
                                    invalid: !rules.uppercase
                                }
                            ]"
                        >
                            <span class="pl-3">One upper case letter</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.lowercase,
                                    invalid: !rules.lowercase
                                }
                            ]"
                        >
                            <span class="pl-3">One lower case letter</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                { valid: rules.number, invalid: !rules.number }
                            ]"
                        >
                            <span class="pl-3">At least one number</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                { valid: rules.symbol, invalid: !rules.symbol }
                            ]"
                        >
                            <span class="pl-3"
                                >At least one symbol @$!%*#?&</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <div class="pb-5">
                <RecaptchaV2
                    @error-callback="handleErrorCallback"
                    @expired-callback="handleExpiredCallback"
                    @load-callback="handleLoadCallback"
                />
            </div>

            <div class="flex mb-2">
                <InputField
                    class="mt-1"
                    variant="checkbox"
                    v-model="acceptPolicies"
                    binary
                    inputId="remember"
                />
                <label class="ml-3 text-sm font-base text-gray-500 leading-6">
                    By creating an account, you agree to our
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
                </label>
            </div>

            <Button
                class="w-full left-loading mt-1"
                label="Create Account"
                :disabled="
                    loading ||
                    !isPasswordValid ||
                    !recaptchaToken ||
                    !acceptPolicies
                "
                :loading="loading"
                type="submit"
            />

            <router-link
                class="primary-text flex justify-center mt-6"
                :to="{
                    name: 'Login'
                }"
            >
                Already have an account? Sign in
            </router-link>
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
<style lang="scss" scoped>
.valid,
.valid::before {
    color: #0e4f26;
}
.valid::before {
    content: '\e909';
    font-family: 'PrimeIcons';
}
.invalid,
.invalid::before {
    color: #b32b23;
}
.invalid::before {
    content: '\e90b';
    font-family: 'PrimeIcons';
}
</style>
