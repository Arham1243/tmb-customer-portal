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

// define your fee rates
function getFeeRate(brand) {
    brand = brand?.toLowerCase();
    if (brand === 'american express' || brand === 'amex') {
        return 0.0444; // 4.44%
    }
    // visa, mastercard or defaults
    return 0.0395; // 3.95%
}

const serviceFee = computed(() => {
    if (!selectedPaymentMethod.value) return 0;
    if (selectedPaymentMethod.value.type !== 'card') {
        return 0;
    }
    const rate = getFeeRate(selectedPaymentMethod.value.brand);
    return subtotal.value * rate;
});

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

        await customerStore.checkout(payload);
        pushRoute('Dashboard');
    } catch (err) {
        console.error(err);
        toast.add({
            severity: 'error',
            summary: 'Oops!',
            detail: 'Payment failed, please try again.',
            life: 3000
        });
    } finally {
        processing.value = false;
    }
};

const total = computed(() => {
    return subtotal.value + serviceFee.value;
});

watch(selectedPaymentMethod, () => {
    acceptFee.value = false;
});
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
                                class="flex items-center gap-4 border py-5 px-4 rounded-lg shadow-sm bg-white cursor-pointer"
                                @click="selectedPaymentMethod = pm"
                                :class="{
                                    'border-primary-500 ring-1 ring-blue-400':
                                        selectedPaymentMethod?.id === pm.id
                                }"
                            >
                                <RadioButton
                                    v-model="selectedPaymentMethod"
                                    :value="pm"
                                    class="mr-3"
                                    :input-id="'pm-' + pm.id"
                                />
                                <template v-if="pm.type === 'card'">
                                    <i
                                        class="pi pi-credit-card text-gray-500 !text-3xl"
                                    ></i>
                                    <div>
                                        <div
                                            class="font-semibold text-[1.1rem]"
                                        >
                                            Credit Card -
                                            {{ pm.brand.toUpperCase() }}
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
                    </div>

                    <div class="flex flex-col gap-y-3 mt-6 pt-4">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Subtotal</span>
                            <span class="text-gray-900 font-medium">{{
                                moneyFormat(subtotal)
                            }}</span>
                        </div>
                        <div
                            class="flex justify-between text-sm"
                            v-if="selectedPaymentMethod?.type === 'card'"
                        >
                            <span class="text-gray-600">Service Fee</span>
                            <span class="text-gray-900 font-medium">{{
                                moneyFormat(serviceFee)
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

                    <div
                        v-if="selectedPaymentMethod?.type === 'card'"
                        class="flex mt-7 mb-3"
                    >
                        <Checkbox
                            binary
                            v-model="acceptFee"
                            class="mr-3"
                            inputId="acceptFee"
                        />
                        <label for="acceptFee" class="cursor-pointer">
                            I understand and accept that a service fee of
                            {{ moneyFormat(serviceFee) }} will be added to my
                            payment for credit card processing.
                        </label>
                    </div>

                    <Button
                        :label="`Pay ${moneyFormat(total)}`"
                        size="large"
                        class="w-full mt-6 !py-4"
                        :disabled="
                            (selectedPaymentMethod?.type === 'card' &&
                                !acceptFee) ||
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
