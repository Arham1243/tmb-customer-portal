<script setup>
import { ref, onBeforeMount, watch } from 'vue';
import { loadStripe } from '@stripe/stripe-js';
import {} from '@/stores';
import { useCustomerStore, useSessionStore } from '@/stores';
import { useToast } from 'primevue/usetoast';

const customerStore = useCustomerStore();
const sessionStore = useSessionStore();
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

const customer = sessionStore.user;
const paymentMethods = ref([]);
const showAddForm = ref(false);
const toast = useToast();
const selectedType = ref('');
const setupClientSecret = ref(null);
const stripe = ref(null);
const elements = ref(null);
const element = ref(null);
const canSave = ref(false);
const loadingMethods = ref(false);
const loadingIntent = ref(false);
const busy = ref(false);

const paymentTypeOptions = [
    { name: 'Credit Card', code: 'card' },
    { name: 'ACH / Bank Account', code: 'us_bank_account' }
];

const openAddForm = async () => {
    showAddForm.value = true;
    await createSetupIntent();
};

const closeAddForm = () => {
    selectedType.value = '';
    showAddForm.value = false;
};

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
    if (!selectedType.value) return;
    loadingIntent.value = true;
    try {
        const payloadType =
            selectedType.value === 'ach'
                ? 'us_bank_account'
                : selectedType.value;
        const res = await customerStore.createSetupIntent({
            type: payloadType
        });
        setupClientSecret.value = res.client_secret;

        stripe.value = await stripePromise;
        elements.value = stripe.value.elements({
            clientSecret: setupClientSecret.value
        });

        if (!elements.value) {
            toast.add({
                severity: 'error',
                summary: 'Oops!',
                detail: 'Stripe Elements failed to initialize',
                life: 3000
            });
            return;
        }

        if (selectedType.value === 'card') {
            element.value = elements.value.create('card', {
                style: {
                    base: {
                        color: '#111827',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '16px',
                        '::placeholder': { color: '#9ca3af' },
                        backgroundColor: '#fff',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '10px'
                    },
                    invalid: {
                        color: '#dc2626'
                    }
                }
            });
        } else if (selectedType.value === 'ach') {
        }
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

const savePaymentMethod = async () => {
    busy.value = true;
    try {
        let result;

        if (selectedType.value === 'card') {
            result = await stripe.value.confirmCardSetup(
                setupClientSecret.value,
                {
                    payment_method: { card: element.value }
                }
            );
        } else if (selectedType.value === 'ach') {
            result = await stripe.value.confirmUsBankAccountPayment(
                setupClientSecret.value,
                {
                    payment_method: {
                        us_bank_account: {
                            routing_number: '110000000',
                            account_number: '000123456789',
                            account_holder_type: 'individual'
                        },
                        billing_details: {
                            name: 'Jenny Rosen',
                            email: 'jenny@example.com'
                        }
                    }
                }
            );
        }
        if (result.error) {
            toast.add({
                severity: 'error',
                summary: 'Oops!',
                detail: result.error.message,
                life: 3000
            });
            return;
        }
        await customerStore.attachPaymentMethod(
            result.setupIntent.payment_method
        );
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
                :disabled="
                    loadingIntent || busy || loadingMethods || showAddForm
                "
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
                        @change="createSetupIntent"
                        :disabled="busy"
                    />
                </div>

                <div class="col-span-12" v-if="selectedType">
                    <div
                        id="stripe-element"
                        class="rounded-xl border border-gray-300 p-4 bg-white shadow-sm"
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

        <div v-if="loadingMethods" class="text-center pb-10">
            <Loader />
        </div>

        <div v-else-if="paymentMethods.length" class="space-y-4">
            <div
                v-for="pm in paymentMethods"
                :key="pm.id"
                class="flex items-center gap-4 border py-5 px-4 rounded-lg shadow-sm bg-white"
            >
                <template v-if="pm.type === 'card'">
                    <i class="pi pi-credit-card text-gray-400 !text-3xl"></i>
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
