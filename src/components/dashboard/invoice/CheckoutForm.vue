<script setup>
import { ref, onBeforeMount, computed, watch } from 'vue';
import { useCustomerStore } from '@/stores';
import { useHelpers } from '@/composables';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
const toast = useToast();

const router = useRouter();
const { moneyFormat } = useHelpers();
const customerStore = useCustomerStore();

const loadingMethods = ref(false);
const paymentMethods = ref([]);
const acceptFee = ref(false);
const acceptBank = ref(false);
const processing = ref(false);
const selectedPaymentMethod = ref(null);
const selectedInvoices = customerStore.selectedInvoices;

const pushRoute = (routeName) => {
    router.push({ name: routeName });
};

onBeforeMount(async () => {
    // if no invoices or all invoices are paid
    if (
        !selectedInvoices.length ||
        selectedInvoices.every((i) => i.payment_status === 'paid')
    ) {
        router.replace({ name: 'Dashboard' });
        return; // stop execution
    }

    // fetch payment methods first
    await fetchPaymentMethods();

    // if no payment methods
    if (!paymentMethods.value?.length) {
        toast.add({
            severity: 'error',
            summary: 'No Payment Methods',
            detail: 'Please add a payment method from your profile before checking out.',
            life: 5000
        });
        router.push({ name: 'Profile' });
        return;
    }

    // otherwise continue
});

const subtotal = computed(() => {
    return selectedInvoices.reduce(
        (total, invoice) => total + invoice.outstanding_balance,
        0
    );
});

const fetchPaymentMethods = async () => {
    loadingMethods.value = true;
    try {
        const res = await customerStore.getPaymentMethods();
        paymentMethods.value = res;
        selectedPaymentMethod.value = res.length ? res[0] : null;
    } finally {
        loadingMethods.value = false;
    }
};

const payInvoices = async () => {
    if (!selectedPaymentMethod.value) return;

    try {
        processing.value = true;
        const payload = {
            payment_method_id: selectedPaymentMethod.value.id,
            amount: total.value,
            invoice_ids: selectedInvoices.map((i) => i.id),
            service_fee: serviceFee.value
        };

        const result = await customerStore.checkout(payload);

        // Determine toast
        let toastOptions = {};
        if (
            result?.requires_webhook ||
            selectedPaymentMethod.value.type === 'us_bank_account'
        ) {
            toastOptions = {
                severity: 'info',
                summary: 'Payment Processing',
                detail: 'Your bank transfer is being processed. This may take 3–5 business days to complete.',
                life: 8000
            };
        } else {
            toastOptions = {
                severity: 'success',
                summary: 'Payment Successful',
                detail: 'Your payment has been processed successfully.',
                life: 3000
            };
        }

        toast.add(toastOptions);

        // Wait for toast to show before navigating
        setTimeout(() => {
            window.location.href = router.resolve({ name: 'Dashboard' }).href;
        }, 500);
    } catch (err) {
        console.error(err);
    } finally {
        processing.value = false;
    }
};

const total = computed(() => {
    return subtotal.value;
});

watch(selectedPaymentMethod, () => {
    acceptFee.value = false;
});

// Helper to get payment method display info
const getPaymentMethodDisplay = (pm) => {
    if (pm.type === 'card') {
        return {
            icon: 'pi-credit-card',
            title: `Credit Card - ${pm.brand.toUpperCase()}`,
            subtitle: `ending in ••••${pm.last4}`
        };
    } else if (pm.type === 'us_bank_account') {
        return {
            icon: 'pi-building',
            title: pm.bank_name ? `${pm.bank_name}` : 'Bank Account',
            subtitle: `ending in ••••${pm.last4}`
        };
    }
    return {
        icon: 'pi-wallet',
        title: 'Payment Method',
        subtitle: ''
    };
};
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 sm:col-span-8 sm:col-start-3">
            <Button
                icon="pi pi-arrow-left"
                label="Back to invoices"
                @click="pushRoute('Dashboard')"
                severity="secondary"
                text
                class="mb-4 !pl-0"
            />

            <Card class="px-2">
                <template #content>
                    <h3 class="text-2xl font-bold mb-4">Checkout</h3>
                    <div class="mt-6 mb-7">
                        <p class="mb-4 font-semibold text-lg">
                            Invoices to Pay
                        </p>
                        <div class="bg-gray-50 px-4 py-4 rounded-lg">
                            <div class="flex flex-col gap-y-2">
                                <div
                                    v-for="invoice in selectedInvoices"
                                    :key="invoice.id"
                                    class="flex items-center text-sm justify-between"
                                >
                                    <p class="text-gray-500 mb-0">
                                        {{ invoice.invoice_number }}
                                    </p>
                                    <p class="font-semibold text-gray-900 mb-0">
                                        {{
                                            moneyFormat(
                                                invoice.outstanding_balance
                                            )
                                        }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Loader v-if="loadingMethods" />
                    <div v-else class="mt-6 mb-7">
                        <p class="mb-4 font-semibold text-lg">
                            Payment Methods
                        </p>
                        <div class="space-y-4">
                            <div
                                v-for="pm in paymentMethods"
                                :key="pm.id"
                                class="flex items-center gap-4 border py-5 px-4 rounded-lg shadow-sm bg-white cursor-pointer transition-all"
                                @click="selectedPaymentMethod = pm"
                                :class="{
                                    'border-primary-500 ring-2 ring-primary-400':
                                        selectedPaymentMethod?.id === pm.id
                                }"
                            >
                                <RadioButton
                                    v-model="selectedPaymentMethod"
                                    :value="pm"
                                    class="mr-3"
                                    :inputId="'pm-' + pm.id"
                                />
                                <i
                                    :class="getPaymentMethodDisplay(pm).icon"
                                    class="pi text-gray-500 !text-3xl"
                                ></i>
                                <div class="flex-1">
                                    <div class="font-semibold text-[1.1rem]">
                                        {{ getPaymentMethodDisplay(pm).title }}
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        {{
                                            getPaymentMethodDisplay(pm).subtitle
                                        }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        v-if="selectedPaymentMethod?.type === 'us_bank_account'"
                        class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
                    >
                        <div class="flex gap-3">
                            <i
                                class="pi pi-info-circle text-blue-600 mt-0.5"
                            ></i>
                            <div class="text-sm text-blue-800">
                                <strong>Bank Transfer Processing:</strong> Your
                                payment will be processed directly from your
                                bank account. This typically takes 3–5 business
                                days to complete.
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-y-3 mt-6 pt-4">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Subtotal</span>
                            <span class="text-gray-900 font-medium">{{
                                moneyFormat(subtotal)
                            }}</span>
                        </div>
                        <div
                            class="flex justify-between border-t pt-5 font-bold mt-3"
                        >
                            <span class="text-gray-900 text-xl">Total</span>
                            <span class="text-gray-900 text-xl">{{
                                moneyFormat(total)
                            }}</span>
                        </div>
                    </div>

                    <!-- Bank Account (ACH) Confirmation -->
                    <div
                        v-if="selectedPaymentMethod?.type === 'us_bank_account'"
                        class="flex mt-7 mb-3"
                    >
                        <Checkbox
                            binary
                            v-model="acceptBank"
                            class="mr-3"
                            inputId="acceptBank"
                        />
                        <label for="acceptBank" class="cursor-pointer">
                            I understand that my payment will be deducted
                            directly from my bank account and may take 3–5
                            business days to complete.
                        </label>
                    </div>

                    <!-- Pay Button -->
                    <Button
                        :label="`Pay ${moneyFormat(total)}`"
                        size="large"
                        class="w-full mt-6 !py-4"
                        :disabled="
                            (selectedPaymentMethod?.type ===
                                'us_bank_account' &&
                                !acceptBank) ||
                            !selectedPaymentMethod ||
                            loadingMethods ||
                            processing
                        "
                        :loading="processing"
                        @click="payInvoices()"
                    />
                </template>
            </Card>
        </div>
    </div>
</template>
