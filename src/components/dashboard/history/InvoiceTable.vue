<script setup>
import { onBeforeMount, ref, watch } from 'vue';
import { useCustomerStore, useSessionStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useReportExport } from '@/composables/useReportExport';

const sessionStore = useSessionStore();
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;
const { exportReport } = useReportExport();
const { formatDate, moneyFormat } = useHelpers();

const customerStore = useCustomerStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const exportMenu = ref(null);
const currentUser = sessionStore.customer;
const filters = ref({
    date_range: [],
    transaction_type: null
});
const showPaymentDialog = ref(false);
const selectedPayment = ref(null);

onBeforeMount(async () => {
    await getItems();
});

watch(
    () => filters.value.date_range,
    (newVal, oldVal) => {
        if (Array.isArray(newVal) && newVal.length > 0) getItems();
    },
    { deep: true }
);

const transactionTypeOptions = [
    { name: 'Payment', code: 'payment' },
    { name: 'Invoice', code: 'invoice' }
];

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () =>
            exportFilteredReport({
                resource: 'transaction-histories',
                format: 'excel'
            })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportFilteredReport({
                resource: 'transaction-histories',
                format: 'pdf'
            })
    }
];

const onPageChange = (event) => {
    pagination.updatePageParams(event);
    getItems();
};

const onSortChange = (event) => {
    pagination.resetPageParams();
    sortFilters.updateSortFilters(event);
    getItems();
};

const showExportMenu = (event) => {
    exportMenu.value.toggle(event);
};

const exportFilteredReport = async ({ resource, format }) => {
    try {
        loading.value = true;

        const filtersPayload = makeFiltersPayload();
        const customFilters = makeCustomFiltersPayload();

        const payload = {
            format,
            columns: ['transaction_type', 'invoice_number', 'date', 'amount'],
            filters: filtersPayload,
            customFilters: customFilters
        };

        await exportReport(resource, payload);
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const clearFilters = () => {
    filters.value = {
        date_range: [],
        transaction_type: null
    };
    getItems();
};

const makeFiltersPayload = () => {
    const filtersPayload = [
        {
            field: 'customer_id',
            operator: '=',
            value: currentUser?.id
        }
    ];
    if (filters.value.transaction_type) {
        filtersPayload.push({
            field: 'transaction_type',
            operator: '=',
            value: filters.value.transaction_type
        });
    }
    return filtersPayload;
};

const makeCustomFiltersPayload = () => {
    const customFilters = [];
    if (filters.value.date_range.length) {
        customFilters.push({
            field: 'transaction_date_range',
            value: filters.value.date_range
        });
    }
    return customFilters;
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = {
            ...pagination.getPageParams()
        };
        const payload = {
            ...sortFilters.getSortFilters(''),
            filters: makeFiltersPayload(),
            customFilters: makeCustomFiltersPayload(),
            includes: [{ relation: 'invoice' }, { relation: 'paymentMethod' }]
        };
        const res = await customerStore.searchTransactionHistories(
            payload,
            params
        );
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const openInvoicePreview = (data) => {
    if (data.invoice && data.invoice.id) {
        window.open(
            `${API_BASE_URL}/invoice/${data.invoice.id}/preview`,
            '_blank'
        );
    }
};

const handleViewClick = (data) => {
    if (data.transaction_type === 'invoice') {
        openInvoicePreview(data);
    } else if (data.transaction_type === 'payment') {
        selectedPayment.value = data;
        showPaymentDialog.value = true;
    }
};

const getPaymentMethodName = (data) => {
    if (data.payment_method_name) {
        return data.payment_method_name;
    }
    if (data.paymentMethod && data.paymentMethod.name) {
        return data.paymentMethod.name;
    }
    return 'N/A';
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl font-bold">Transaction History</h1>
            </div>
        </template>
        <template #actions>
            <Button
                label="Export"
                icon="pi pi-download"
                variant="outlined"
                size="medium"
                @click="showExportMenu($event)"
                :disabled="items.length === 0 || loading"
            />

            <Menu ref="exportMenu" :model="exportMenuItems" :popup="true" />
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
                :value="items"
                :page="pagination.page"
                :sort-field="pagination.sortField"
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @sort="onSortChange"
                @page="onPageChange"
            >
                <template #header>
                    <div
                        class="grid grid-cols-12 items-end gap-4 space-y-1 mb-10"
                    >
                        <div class="col-span-4">
                            <label
                                for="status"
                                class="mb-2 block font-semibold text-gray-700"
                            >
                                Transaction Type
                            </label>
                            <InputField
                                showClear
                                v-model="filters.transaction_type"
                                @change="getItems()"
                                id="transactionType"
                                class="w-full"
                                placeholder="Select"
                                variant="dropdown"
                                optionLabel="name"
                                optionValue="code"
                                :options="transactionTypeOptions"
                            />
                        </div>
                        <div class="col-span-4">
                            <label
                                for="status"
                                class="mb-2 block font-semibold text-gray-700"
                            >
                                Date
                            </label>
                            <InputField
                                placeholder="Select Date Range"
                                v-model="filters.date_range"
                                :range="true"
                                variant="date"
                            />
                        </div>
                        <div class="col-span-4">
                            <Button
                                v-if="
                                    filters.date_range.length ||
                                    filters.transaction_type
                                "
                                link
                                label="Clear Filters"
                                @click="clearFilters()"
                            />
                        </div>
                    </div>
                </template>
                <template #empty> No transaction history found. </template>

                <Column
                    header="Transaction Type"
                    :sortable="true"
                    field="transaction_type"
                >
                    <template #body="{ data }">
                        <StatusTag
                            :status="
                                data.transaction_type === 'payment'
                                    ? 'Payment'
                                    : 'Invoice'
                            "
                        />
                    </template>
                </Column>

                <Column sortable field="invoice_number" header="Invoice Number">
                    <template #body="{ data }">
                        <div v-if="data.transaction_type !== 'payment'">
                            {{ data.invoice_number }}
                        </div>
                    </template>
                </Column>

                <Column sortable field="date" header="Date">
                    <template #body="{ data }">
                        {{ formatDate(data.date) }}
                    </template>
                </Column>

                <Column
                    sortable
                    field="amount"
                    header="Amount"
                    class="amount-column"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.amount) }}
                    </template>
                </Column>

                <Column header="View" class="text-center flex justify-center">
                    <template #body="{ data }">
                        <Button
                            @click="handleViewClick(data)"
                            text
                            class="!p-2"
                            variant="outlined"
                            icon="pi pi-eye"
                            label="View"
                        />
                    </template>
                </Column>
            </BaseTable>
        </template>
    </Card>

    <!-- Payment Details Dialog -->
    <Dialog
        v-model:visible="showPaymentDialog"
        modal
        header="Payment Details"
        :style="{ width: '500px' }"
    >
        <div v-if="selectedPayment" class="space-y-5">
            <!-- Top Section -->
            <Card class="!bg-gray-100">
                <template #title>
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">
                        Payment Summary
                    </h3>
                </template>
                <template #content>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-500 mb-0">Amount</p>
                            <p class="text-lg font-bold">
                                {{ moneyFormat(selectedPayment.amount) }}
                            </p>
                        </div>

                        <div>
                            <p class="text-sm text-gray-500 mb-0">Status</p>
                            <div class="mt-1">
                                <StatusTag :status="selectedPayment.status" />
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Details Card -->
            <Card class="!bg-gray-100">
                <template #title>
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">
                        Details
                    </h3>
                </template>
                <template #content>
                    <div class="grid gap-y-2">
                        <div>
                            <p class="text-sm text-gray-500 mb-0">Date</p>
                            <p class="text-base font-medium">
                                {{ formatDate(selectedPayment.date) }}
                            </p>
                        </div>

                        <div>
                            <p class="text-sm text-gray-500 mb-0">
                                Invoice Number
                            </p>
                            <p class="text-base font-medium">
                                {{ selectedPayment.invoice_number }}
                            </p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500 mb-0">
                                Payment Method
                            </p>
                            <p class="text-base font-medium capitalize">
                                {{ getPaymentMethodName(selectedPayment) }}
                            </p>
                        </div>

                        <div v-if="selectedPayment.reference_number">
                            <p class="text-sm text-gray-500 mb-0">
                                Reference Number
                            </p>
                            <p class="text-base font-medium">
                                {{ selectedPayment.reference_number }}
                            </p>
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <template #footer>
            <Button
                label="Close"
                @click="showPaymentDialog = false"
                variant="outlined"
            />
        </template>
    </Dialog>
</template>
