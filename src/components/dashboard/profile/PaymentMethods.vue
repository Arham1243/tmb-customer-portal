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
const showVerifyDialog = ref(false);
const verifyingPaymentMethod = ref(null);
const microDeposit1 = ref('');
const microDeposit2 = ref('');
const verifyingBusy = ref(false);
const showDeleteDialog = ref(false);
const deletingPaymentMethod = ref(null);
const deletingBusy = ref(false);

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

        // Determine if verification is required
        const requiresVerification =
            result.setupIntent.status === 'requires_action' ||
            result.setupIntent.status === 'requires_confirmation';

        // For ACH accounts, pass verification status to backend
        if (selectedType.value === 'us_bank_account') {
            await customerStore.attachPaymentMethod(
                result.setupIntent.payment_method,
                requiresVerification
            );

            closeAddForm();
            await fetchPaymentMethods();

            // Show appropriate message based on verification requirement
            if (requiresVerification) {
                toast.add({
                    severity: 'success',
                    summary: 'Bank Account Added',
                    detail: 'Your bank account has been added successfully. Two micro-deposits will be sent to your account within 1-2 business days. Please verify the amounts once received.',
                    life: 8000
                });
            } else {
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Bank account verified and added successfully',
                    life: 3000
                });
            }
        } else {
            // For cards, attach normally
            await customerStore.attachPaymentMethod(
                result.setupIntent.payment_method,
                false
            );

            closeAddForm();
            await fetchPaymentMethods();
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Payment method added successfully',
                life: 3000
            });
        }
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

const openVerifyDialog = (pm) => {
    verifyingPaymentMethod.value = pm;
    microDeposit1.value = '';
    microDeposit2.value = '';
    showVerifyDialog.value = true;
};

const closeVerifyDialog = () => {
    showVerifyDialog.value = false;
    verifyingPaymentMethod.value = null;
    microDeposit1.value = '';
    microDeposit2.value = '';
};

const submitVerification = async () => {
    if (!microDeposit1.value || !microDeposit2.value) {
        toast.add({
            severity: 'warn',
            summary: 'Missing Information',
            detail: 'Please enter both micro-deposit amounts',
            life: 3000
        });
        return;
    }

    verifyingBusy.value = true;
    try {
        await customerStore.verifyMicroDeposits({
            payment_method_id: verifyingPaymentMethod.value.id,
            amounts: [
                parseInt(microDeposit1.value),
                parseInt(microDeposit2.value)
            ]
        });

        toast.add({
            severity: 'success',
            summary: 'Verified',
            detail: 'Bank account verified successfully',
            life: 3000
        });

        await fetchPaymentMethods();
        closeVerifyDialog();
    } catch (err) {
        console.error('Verification error:', err);
        toast.add({
            severity: 'error',
            summary: 'Verification Failed',
            detail:
                err.response?.data?.error ||
                'Failed to verify bank account. Please check the amounts and try again.',
            life: 5000
        });
    } finally {
        verifyingBusy.value = false;
    }
};

const openDeleteDialog = (pm) => {
    deletingPaymentMethod.value = pm;
    showDeleteDialog.value = true;
};

const closeDeleteDialog = () => {
    showDeleteDialog.value = false;
    deletingPaymentMethod.value = null;
};

const confirmDelete = async () => {
    deletingBusy.value = true;
    try {
        await customerStore.removePaymentMethod(deletingPaymentMethod.value.id);

        toast.add({
            severity: 'success',
            summary: 'Removed',
            detail: 'Payment method removed successfully',
            life: 3000
        });

        closeDeleteDialog();
        await fetchPaymentMethods();
    } catch (err) {
        console.error('Delete error:', err);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail:
                err.response?.data?.error || 'Failed to remove payment method',
            life: 3000
        });
    } finally {
        deletingBusy.value = false;
    }
};

const getStatusSeverity = (status) => {
    switch (status) {
        case 'verified':
            return 'success';
        case 'pending':
            return 'warn';
        case 'failed':
            return 'danger';
        default:
            return 'secondary';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'verified':
            return 'Verified';
        case 'pending':
            return 'Pending Verification';
        case 'failed':
            return 'Verification Failed';
        default:
            return status;
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
                    <div class="flex-1">
                        <div class="font-semibold text-[1.1rem]">
                            Credit Card - {{ pm.brand.toUpperCase() }}
                        </div>
                        <div class="text-sm text-gray-500">
                            ending in ••••{{ pm.last4 }}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            rounded
                            @click="openDeleteDialog(pm)"
                        />
                    </div>
                </template>
                <template v-else-if="pm.type === 'us_bank_account'">
                    <i class="pi pi-building text-gray-400 !text-3xl"></i>
                    <div class="flex-1">
                        <div
                            class="font-semibold text-[1.1rem] flex items-center gap-2"
                        >
                            <span
                                >Bank Account -
                                {{ pm.bank_name || 'ACH' }}</span
                            >
                            <Tag
                                :value="getStatusLabel(pm.status)"
                                :severity="getStatusSeverity(pm.status)"
                            />
                        </div>
                        <div class="text-sm text-gray-500">
                            ending in ••••{{ pm.last4 }}
                        </div>
                        <div
                            v-if="pm.status === 'pending'"
                            class="mt-2 text-sm text-blue-600"
                        >
                            <i class="pi pi-info-circle mr-1"></i>
                            Two micro-deposits will be sent to your account
                            within 1-2 business days. Please verify once
                            received.
                        </div>
                        <div
                            v-if="pm.status === 'failed'"
                            class="mt-2 text-sm text-red-600"
                        >
                            <i class="pi pi-exclamation-triangle mr-1"></i>
                            Verification failed. Please check the amounts and
                            try again.
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button
                            v-if="pm.status === 'pending'"
                            label="Verify"
                            size="small"
                            @click="openVerifyDialog(pm)"
                        />
                        <Button
                            v-if="pm.status === 'failed'"
                            label="Retry Verification"
                            size="small"
                            @click="openVerifyDialog(pm)"
                        />
                        <Button
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            rounded
                            @click="openDeleteDialog(pm)"
                        />
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

        <!-- Verify Micro-Deposits Dialog -->
        <Dialog
            v-model:visible="showVerifyDialog"
            modal
            :header="
                verifyingPaymentMethod?.status === 'failed'
                    ? 'Retry Bank Account Verification'
                    : 'Verify Bank Account'
            "
            :style="{ width: '500px' }"
            :closable="!verifyingBusy"
        >
            <div class="space-y-4 mb-5">
                <p
                    v-if="verifyingPaymentMethod?.status === 'failed'"
                    class="text-red-600 font-medium"
                >
                    <i class="pi pi-exclamation-triangle mr-1"></i>
                    Previous verification attempt failed. Please double-check
                    the amounts and try again.
                </p>
                <p class="text-gray-600">
                    Please enter the two micro-deposit amounts that were sent to
                    your bank account ending in ••••{{
                        verifyingPaymentMethod?.last4
                    }}.
                </p>
                <p class="text-sm text-gray-500">
                    These amounts are typically less than $1.00 and should
                    appear in your account within 1-2 business days.
                </p>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block mb-2 font-medium"
                            >First Amount (cents)</label
                        >
                        <InputField
                            id="deposit1"
                            v-model="microDeposit1"
                            variant="number"
                            inputClass="w-full"
                            placeholder="e.g., 32"
                            :min="1"
                            :max="99"
                            :disabled="verifyingBusy"
                        />
                    </div>
                    <div>
                        <label class="block mb-2 font-medium"
                            >Second Amount (cents)</label
                        >
                        <InputField
                            id="deposit2"
                            v-model="microDeposit2"
                            variant="number"
                            inputClass="w-full"
                            placeholder="e.g., 45"
                            :min="1"
                            :max="99"
                            :disabled="verifyingBusy"
                        />
                    </div>
                </div>
                <p class="text-sm font-bold mt-2">
                    Enter the exact amounts Stripe deposited into your bank
                    account in cents. For example, if you see 0.23 USD, enter 23
                </p>
            </div>

            <template #footer>
                <Button
                    label="Cancel"
                    severity="secondary"
                    @click="closeVerifyDialog"
                    :disabled="verifyingBusy"
                />
                <Button
                    label="Verify"
                    @click="submitVerification"
                    :loading="verifyingBusy"
                    :disabled="verifyingBusy"
                />
            </template>
        </Dialog>

        <!-- Delete Confirmation Dialog -->
        <Dialog
            v-model:visible="showDeleteDialog"
            modal
            header="Remove Payment Method"
            :style="{ width: '450px' }"
            :closable="!deletingBusy"
        >
            <div class="space-y-4 mb-5">
                <p class="text-gray-600">
                    Are you sure you want to remove this payment method?
                </p>
                <div
                    v-if="deletingPaymentMethod"
                    class="bg-gray-50 p-4 rounded-lg"
                >
                    <div class="font-semibold">
                        <template v-if="deletingPaymentMethod.type === 'card'">
                            Credit Card -
                            {{ deletingPaymentMethod.brand.toUpperCase() }}
                        </template>
                        <template v-else>
                            Bank Account -
                            {{ deletingPaymentMethod.bank_name || 'ACH' }}
                        </template>
                    </div>
                    <div class="text-sm text-gray-500 mt-1">
                        ending in ••••{{ deletingPaymentMethod.last4 }}
                    </div>
                </div>
                <p class="text-sm text-gray-500">
                    This action cannot be undone.
                </p>
            </div>

            <template #footer>
                <Button
                    label="Cancel"
                    severity="secondary"
                    @click="closeDeleteDialog"
                    :disabled="deletingBusy"
                />
                <Button
                    label="Remove"
                    severity="danger"
                    @click="confirmDelete"
                    :loading="deletingBusy"
                    :disabled="deletingBusy"
                />
            </template>
        </Dialog>
    </div>
</template>
