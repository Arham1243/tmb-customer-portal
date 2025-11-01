<script setup>
import { onBeforeMount, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore, useSessionStore, useGlobalStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const company = sessionStore.customerCompany;
const currentCustomerUuid = route.params?.customer_id;
const globalStore = useGlobalStore();

const loading = ref(false);
const credentials = ref({
    email: route.query?.email || '',
    password: '',
    customer_id: currentCustomerUuid
});

onBeforeMount(() => {
    globalStore.clearErrors();
});

const register = async () => {
    try {
        loading.value = true;
        await authStore.register(credentials.value);

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
            <Button
                class="w-full left-loading mt-1"
                label="Create Account"
                :disabled="loading"
                :loading="loading"
                type="submit"
            />

            <router-link
                class="primary-text flex justify-center mt-6"
                :to="{
                    name: 'Login',
                    params: { customer_id: currentCustomerUuid }
                }"
            >
                Already have an account? Sign in
            </router-link>
        </form>
    </div>
</template>
