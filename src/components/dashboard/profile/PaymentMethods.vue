<script setup>
import { ref, onBeforeMount } from 'vue';
import { loadStripe } from '@stripe/stripe-js';
import { useCustomerStore } from '@/stores';
import { useToast } from 'primevue/usetoast';

const customerStore = useCustomerStore();
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

const paymentMethods = ref([]);
const showAddForm = ref(false);
const toast = useToast();
const selectedType = ref('us_bank_account');
const setupClientSecret = ref(null);
const stripe = ref(null);
const elements = ref(null);
const element = ref(null);
const canSave = ref(false);
const loadingMethods = ref(false);
const loadingIntent = ref(false);
const busy = ref(false);

const paymentTypeOptions = [
    { name: 'Direct Bank transfer', code: 'us_bank_account' }
];

const openAddForm = async () => {
    showAddForm.value = true;
    await createSetupIntent();
};

const closeAddForm = () => {
    if (element.value) {
        element.value.unmount();
        element.value = null;
    }
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
        // Unmount previous element if it exists
        if (element.value) {
            element.value.unmount();
            element.value = null;
        }

        const res = await customerStore.createSetupIntent({
            type: selectedType.value
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
                        '::placeholder': { color: '#9ca3af' }
                    },
                    invalid: {
                        color: '#dc2626'
                    }
                }
            });

            element.value.mount('#stripe-element');
            element.value.on('change', (event) => {
                canSave.value = event.complete;
            });
        } else if (selectedType.value === 'us_bank_account') {
            // For ACH, use the Payment Element which handles US Bank Account
            element.value = elements.value.create('payment', {
                layout: {
                    type: 'accordion',
                    defaultCollapsed: false,
                    radios: false,
                    spacedAccordionItems: true
                }
            });

            if (!element.value) {
                toast.add({
                    severity: 'error',
                    summary: 'Oops!',
                    detail: 'Failed to create payment element',
                    life: 3000
                });
                return;
            }

            element.value.mount('#stripe-element');

            element.value.on('ready', () => {
                console.log('Payment element ready');
            });

            element.value.on('change', (event) => {
                canSave.value = event.complete;
            });
        }
    } catch (err) {
        console.error('Error creating setup intent:', err);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err.message || 'Failed to initialize payment form',
            life: 3000
        });
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
        } else if (selectedType.value === 'us_bank_account') {
            // For ACH/Bank Account, use confirmSetup with elements
            result = await stripe.value.confirmSetup({
                elements: elements.value,
                confirmParams: {
                    return_url: window.location.href
                },
                redirect: 'if_required'
            });
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

        // Check if setup requires action (for ACH micro-deposits)
        if (
            result.setupIntent.status === 'requires_action' ||
            result.setupIntent.status === 'requires_confirmation'
        ) {
            toast.add({
                severity: 'info',
                summary: 'Verification Required',
                detail: 'Please verify your bank account to complete setup.',
                life: 5000
            });
            return;
        }

        await customerStore.attachPaymentMethod(
            result.setupIntent.payment_method
        );

        await fetchPaymentMethods();
        closeAddForm();
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Payment method added successfully',
            life: 3000
        });
    } catch (err) {
        console.error('Error saving payment method:', err);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err.message || 'Failed to save payment method',
            life: 3000
        });
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
                class="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg"
            >
                <Loader />
            </div>

            <div class="mb-5">
                <div class="flex items-center justify-between">
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
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div class="mb-3 col-span-12">
                    <label class="block mb-3 font-medium">Payment Type</label>
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
                        :disabled="true"
                    />
                </div>

                <div class="col-span-12" v-if="selectedType">
                    <p class="mb-2">
                        Please search your bank, if can't be found in the list
                        below
                    </p>
                    <div
                        id="stripe-element"
                        :class="
                            selectedType === 'card'
                                ? 'rounded-xl border border-gray-300 p-4 bg-white shadow-sm min-h-[100px]'
                                : ''
                        "
                    ></div>
                </div>

                <div class="col-span-12 flex justify-start">
                    <Button
                        label="Save Payment Method"
                        class="mt-4"
                        :disabled="busy || !canSave || loadingIntent"
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
                <template v-else-if="pm.type === 'us_bank_account'">
                    <i class="pi pi-building text-gray-400 !text-3xl"></i>
                    <div>
                        <div class="font-semibold text-[1.1rem]">
                            Bank Account - {{ pm.bank_name || 'ACH' }}
                        </div>
                        <div class="text-sm text-gray-500">
                            ending in ••••{{ pm.last4 }}
                        </div>
                    </div>
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
