<script setup>
import { ref, onBeforeMount, watch } from 'vue';
import { loadStripe } from '@stripe/stripe-js';
import { useCustomerStore } from '@/stores';
import { useToast } from 'primevue/usetoast';

const customerStore = useCustomerStore();
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

const paymentMethods = ref([]);
const showAddForm = ref(false);
const toast = useToast();
const selectedType = ref('card');
const setupClientSecret = ref(null);
const stripe = ref(null);
const elements = ref(null);
const element = ref(null);
const canSave = ref(false);
const loadingMethods = ref(false); // fetching payment methods
const loadingIntent = ref(false); // fetching setup intent
const busy = ref(false); // saving payment method

const paymentTypeOptions = [{ name: 'Credit Card', code: 'card' }];

const fetchPaymentMethods = async () => {
    loadingMethods.value = true;
    try {
        const res = await customerStore.getPaymentMethods();
        paymentMethods.value = res;
    } finally {
        loadingMethods.value = false;
    }
};

const createSetupIntent = async () => {
    loadingIntent.value = true;
    try {
        const res = await customerStore.createSetupIntent();
        setupClientSecret.value = res.client_secret;
        stripe.value = await stripePromise;
        elements.value = stripe.value.elements({
            clientSecret: setupClientSecret.value
        });
        element.value = elements.value.create('card');
        element.value.mount('#stripe-element');
        element.value.on('change', (event) => {
            canSave.value = event.complete;
        });
    } catch (err) {
        console.error(err);
    } finally {
        loadingIntent.value = false;
    }
};

const openAddForm = async () => {
    showAddForm.value = true;
    await createSetupIntent();
};

const closeAddForm = () => {
    showAddForm.value = false;
};

watch(selectedType, async () => {
    if (showAddForm.value) await createSetupIntent();
});

const savePaymentMethod = async () => {
    busy.value = true;
    try {
        const { error, setupIntent } = await stripe.value.confirmCardSetup(
            setupClientSecret.value, // pass the client secret
            {
                payment_method: {
                    card: element.value
                }
            }
        );

        if (error) {
            toast.add({
                severity: 'error',
                summary: 'Oops!',
                detail: error.message,
                life: 3000
            });
            return;
        }

        await customerStore.attachPaymentMethod(setupIntent.payment_method);
        await fetchPaymentMethods();
        showAddForm.value = false;
    } finally {
        busy.value = false;
    }
};

onBeforeMount(() => {
    fetchPaymentMethods();
});
</script>

<template>
    <div>
        <div class="flex items-center justify-between mb-10">
            <h3 class="text-2xl font-bold">Payment Methods</h3>
            <Button
                icon="pi pi-plus"
                label="Add Payment Method"
                @click="openAddForm"
                :disabled="loadingIntent || busy || loadingMethods"
            />
        </div>

        <div
            v-if="showAddForm"
            class="border rounded-lg p-6 bg-white mb-8 relative"
        >
            <div
                v-if="loadingIntent"
                class="absolute inset-0 bg-white/70 flex items-center justify-center z-10"
            >
                <Loader />
            </div>

            <div class="flex items-center justify-between mb-4">
                <h4 class="text-xl font-semibold">New Payment Method</h4>
                <Button
                    icon="pi pi-times"
                    rounded
                    text
                    severity="secondary"
                    @click="closeAddForm"
                    :disabled="busy"
                />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div class="mb-3 col-span-12">
                    <label class="block mb-3">Payment Type</label>
                    <InputField
                        id="payment_type"
                        variant="dropdown"
                        v-model="selectedType"
                        :options="paymentTypeOptions"
                        optionLabel="name"
                        optionValue="code"
                        class="w-full"
                        placeholder="Select"
                        :disabled="busy"
                    />
                </div>

                <div class="col-span-12">
                    <label class="block mb-3">Payment Details</label>
                    <div
                        id="stripe-element"
                        class="border rounded p-3 min-h-[50px]"
                    ></div>
                </div>

                <div class="col-span-12 flex justify-start">
                    <Button
                        label="Save Payment Method"
                        class="mt-4"
                        :disabled="busy || !canSave"
                        :loading="busy"
                        @click="savePaymentMethod"
                    />
                </div>
            </div>
        </div>

        <div v-if="loadingMethods" class="text-center py-4">
            <Loader />
        </div>

        <div v-else-if="paymentMethods.length" class="space-y-4">
            <div
                v-for="pm in paymentMethods"
                :key="pm.id"
                class="flex items-center gap-4 border py-5 px-4 rounded-lg shadow-sm bg-white"
            >
                <template v-if="pm.type === 'card'">
                    <i class="pi pi-credit-card text-gray-500 !text-3xl"></i>
                    <div>
                        <div class="font-semibold text-[1.1rem]">
                            Credit Card - {{ pm.brand.toUpperCase() }}
                        </div>
                        <div class="text-sm text-gray-500">
                            ending in ••••{{ pm.last4 }}
                        </div>
                    </div>
                </template>
                <template v-else>
                    <div class="font-semibold">ACH</div>
                </template>
            </div>
        </div>

        <div
            v-else-if="!paymentMethods.length && !showAddForm"
            class="text-center py-4 text-gray-500"
        >
            No payment methods found
        </div>
    </div>
</template>
