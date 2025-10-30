<script setup>
import { onBeforeMount, computed } from 'vue';
import { useCustomerStore } from '@/stores';
import { useHelpers } from '@/composables';
import { useRouter } from 'vue-router';

const router = useRouter();
const { moneyFormat } = useHelpers();
const customerStore = useCustomerStore();
const selectedInvoices = customerStore.selectedInvoices;

const pushRoute = (routeName) => {
    router.push({ name: routeName });
};

onBeforeMount(() => {
    if (
        !selectedInvoices.length ||
        selectedInvoices.every((i) => i.payment_status === 'paid')
    ) {
        router.replace({ name: 'Dashboard' });
    }
});

const subtotal = computed(() => {
    return selectedInvoices.reduce(
        (total, invoice) => total + invoice.outstanding_balance,
        0
    );
});

const total = computed(() => {
    return subtotal.value;
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

                    <p class="mb-1 font-semibold text-lg">Invoices to Pay</p>

                    <div class="bg-gray-50 px-4 py-4 rounded-lg my-4">
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
                                        moneyFormat(invoice.outstanding_balance)
                                    }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-y-3 mt-6 pt-4">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Subtotal</span>
                            <span class="text-gray-900 font-medium">
                                {{ moneyFormat(subtotal) }}
                            </span>
                        </div>

                        <div
                            class="flex justify-between border-t pt-5 font-bold mt-3"
                        >
                            <span class="text-gray-900 text-xl">Total</span>
                            <span class="text-gray-900 text-xl">
                                {{ moneyFormat(total) }}
                            </span>
                        </div>
                    </div>

                    <Button
                        :label="`Pay ${moneyFormat(total)}`"
                        size="large"
                        class="w-full mt-6 !py-4"
                        @click=""
                    />
                </template>
            </Card>
        </div>
    </div>
</template>
