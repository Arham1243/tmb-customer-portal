<script setup>
import { ref, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { paymentTypes } from '@/config/enums';
import { useReceiptStore } from '@/modules/accounting/stores';
import { useHelpers } from '@/composables';

const router = useRouter();
const route = useRoute();
const { formatDate, moneyFormat } = useHelpers();
const receiptStore = useReceiptStore();
const loading = ref(false);
const receiptId = ref(route.params.id);
const receipt = ref({});

onBeforeMount(async () => {
    await getItem();
});

const pushRoute = (name) => router.push({ name });

const getItem = async () => {
    if (!receiptId.value) return;
    try {
        loading.value = true;
        const params = {
            include: 'paymentMethod,customer,deductionType,invoices'
        };
        const res = await receiptStore.getItem(receiptId.value, params);
        receipt.value = res.data;
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <TitleHeader>
            <template #title>
                <div class="flex items-center gap-5">
                    <Button
                        variant="outlined"
                        icon="pi pi-chevron-left"
                        @click="pushRoute('Receipts')"
                    />
                    <h1 class="text-2xl font-bold">
                        {{ receipt.reference_number }}
                    </h1>
                </div>
            </template>
            <template #actions>
                <Button
                    label="Export"
                    variant="outlined"
                    class="w-full sm:w-auto"
                />
            </template>
        </TitleHeader>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="lg:col-span-1" v-if="receipt.invoices.length">
                <Card>
                    <template #content>
                        <h5 class="mb-4 font-semibold text-lg">
                            Invoice Details
                        </h5>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600"
                                    >Invoice Number</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{
                                        receipt.invoices?.[0]?.invoice_number ??
                                        '-'
                                    }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Invoice Date</span>
                                <span class="font-semibold text-gray-900">
                                    {{
                                        formatDate(
                                            receipt.invoices?.[0]?.invoice_date
                                        )
                                    }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Total Amount</span>
                                <span class="font-semibold text-gray-900">
                                    {{
                                        moneyFormat(
                                            receipt.invoices?.[0]
                                                ?.total_billable
                                        )
                                    }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600"
                                    >Amount Received</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{ moneyFormat(receipt.amount_received) }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600"
                                    >Outstanding Balance</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{
                                        moneyFormat(
                                            receipt.invoices?.[0]
                                                ?.outstanding_balance
                                        )
                                    }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600"
                                    >Payment Status</span
                                >
                                <StatusTag
                                    :status="
                                        receipt.invoices?.[0]?.payment_status ||
                                        'unknown'
                                    "
                                />
                            </div>
                        </div>
                    </template>
                </Card>
            </div>

            <div class="lg:col-span-1">
                <Card>
                    <template #content>
                        <h5 class="mb-4 font-semibold text-lg">
                            Receipt Details
                        </h5>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Receipt Date</span>
                                <span class="font-semibold text-gray-900">
                                    {{ formatDate(receipt.receipt_date) }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600"
                                    >Amount Received</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{ moneyFormat(receipt.amount_received) }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Payment Type</span>
                                <span class="font-semibold text-gray-900">
                                    {{
                                        paymentTypes.find(
                                            (p) =>
                                                p.code === receipt.payment_type
                                        )?.name || '-'
                                    }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600"
                                    >Payment Method</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{ receipt.paymentMethod?.name ?? '-' }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Customer</span>
                                <span class="font-semibold text-gray-900">
                                    {{ receipt.customer?.name ?? '-' }}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600"
                                    >Payment Method</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{ receipt.paymentMethod?.name ?? '-' }}
                                </span>
                            </div>
                            <div
                                class="flex justify-between"
                                v-if="
                                    receipt.invoices?.[0]?.pivot
                                        ?.difference_amount > 0
                                "
                            >
                                <span class="text-gray-600"
                                    >Applied Amount</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{
                                        moneyFormat(
                                            receipt.invoices?.[0]?.pivot
                                                ?.difference_amount
                                        ) ?? '-'
                                    }}
                                </span>
                            </div>
                            <div
                                class="flex justify-between"
                                v-if="receipt.deductionType"
                            >
                                <span class="text-gray-600"
                                    >Deduction Type</span
                                >
                                <span class="font-semibold text-gray-900">
                                    {{ receipt.deductionType?.name ?? '-' }}
                                </span>
                            </div>
                        </div>
                    </template>
                </Card>
            </div>
        </div>
    </template>
</template>
