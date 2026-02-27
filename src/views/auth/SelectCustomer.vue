<script setup>
import { ref, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores';
import { AuthService } from '@/services';

const router = useRouter();
const sessionStore = useSessionStore();
const company = sessionStore.customerCompany;

const loading = ref(true);
const customers = ref([]);

onBeforeMount(async () => {
    try {
        if (!sessionStore.customerCompany) {
            await sessionStore.meCustomer();
        }
        const res = await AuthService.myCustomers();
        customers.value = res.data.data;
        if (customers.value.length === 1) {
            goToPortal(customers.value[0].uuid);
            return;
        }
    } catch (e) {
        console.error('Failed to load customers:', e);
    } finally {
        loading.value = false;
    }
});

const goToPortal = (customerId) => {
    router.push({ name: 'Dashboard', params: { customerId } });
};
</script>

<template>
    <div
        class="w-screen h-screen flex justify-center items-center"
        v-if="loading"
    >
        <Loader />
    </div>
    <div
        v-else
        class="min-h-screen flex items-center justify-center bg-[#F6F9FB] overflow-x-hidden py-20"
    >
        <div class="w-full max-w-[600px]">
            <div
                class="bg-white custom-shadow rounded-lg text-gray-800 px-[2.25rem] sm:px-[1.75rem] py-[2rem] overflow-x-hidden"
            >
                <div class="text-center mb-8">
                    <img
                        v-if="company?.logo_url"
                        :src="company?.logo_url"
                        :alt="company?.name"
                        class="mx-auto company-logo mb-2"
                    />
                    <h4 class="text-2xl font-bold mb-2">Select a Customer</h4>
                    <p class="text-gray-500">
                        Your account is associated with multiple customers.
                        Please select which customer portal you'd like to
                        access.
                    </p>
                </div>

                <div class="flex flex-col gap-3">
                    <div
                        v-for="customer in customers"
                        :key="customer.id"
                        class="flex items-center justify-between border rounded-lg px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                        <div>
                            <div class="font-semibold text-gray-800">
                                {{ customer.legal_name || customer.name }}
                            </div>
                            <div
                                v-if="
                                    customer.legal_name &&
                                    customer.legal_name !== customer.name
                                "
                                class="text-sm text-gray-500"
                            >
                                {{ customer.name }}
                            </div>
                        </div>
                        <Button
                            label="Access Portal"
                            size="small"
                            @click="goToPortal(customer.uuid)"
                        />
                    </div>
                </div>

                <div
                    v-if="!customers.length"
                    class="text-center text-gray-500 py-8"
                >
                    No customers found for your account.
                </div>
            </div>
        </div>
        <Toast />
    </div>
</template>

<style scoped>
.custom-shadow {
    box-shadow: 0 0 15px 5px #0000001a;
}
</style>
