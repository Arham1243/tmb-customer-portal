<script setup>
import { onBeforeMount, ref, watch } from 'vue';
import { useCustomerStore, useSessionStore } from '@/stores';
import { PaginationOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useReportExport } from '@/composables/useReportExport';

const sessionStore = useSessionStore();
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}`;
const { exportReport } = useReportExport();
const { formatDate, moneyFormat } = useHelpers();

const customerStore = useCustomerStore();

const pagination = new PaginationOptions();
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const exportMenu = ref(null);
const currentUser = sessionStore.customer;
const filters = ref({
    date_range: [],
    transaction_type: null
});

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
            exportFilteredReport({ resource: 'invoices', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportFilteredReport({ resource: 'invoices', format: 'pdf' })
    }
];

const onPageChange = (event) => {
    pagination.updatePageParams(event);
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
            columns: [
                'payment_status',
                'invoice_number',
                'invoice_date',
                'outstanding_balance'
            ],
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
        },
        {
            field: 'status',
            operator: '=',
            value: 'approved'
        }
    ];
    if (filters.value.transaction_type) {
        if (filters.value.transaction_type === 'payment') {
            filtersPayload.push({
                field: 'payment_status',
                operator: '=',
                value: 'paid'
            });
        } else if (filters.value.transaction_type === 'invoice') {
            filtersPayload.push({
                field: 'payment_status',
                operator: 'in',
                value: ['unpaid', 'partially_paid']
            });
        }
    }
    return filtersPayload;
};

const makeCustomFiltersPayload = () => {
    const customFilters = [];
    if (filters.value.date_range.length) {
        customFilters.push({
            field: 'invoice_date_range',
            value: filters.value.date_range
        });
    }
    return customFilters;
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = {
            filters: makeFiltersPayload(),
            customFilters: makeCustomFiltersPayload()
        };
        const res = await customerStore.searchInvoices(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const openInvoicePreview = (data) => {
    window.open(`${API_BASE_URL}/invoice/${data.id}/preview`, '_blank');
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
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @page="onPageChange"
            >
                <template #header>
                    <div
                        class="grid grid-cols-12 items-end gap-4 space-y-1 mb-10"
                    >
                        <div class="col-span-4">
                            <label
                                for="status"
                                class="mb-2 block font-medium text-gray-700"
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
                                class="mb-2 block font-medium text-gray-700"
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
                <template #empty> No invoices found. </template>

                <Column
                    header="Transaction Type"
                    :sortable="true"
                    field="payment_status"
                >
                    <template #body="{ data }">
                        <StatusTag
                            :status="
                                data.payment_status === 'paid'
                                    ? 'Payment'
                                    : 'Invoice'
                            "
                        />
                    </template>
                </Column>

                <Column field="invoice_number" header="Invoice Number" />

                <Column field="invoice_date" header="Date">
                    <template #body="{ data }">
                        {{ formatDate(data.invoice_date) }}
                    </template>
                </Column>

                <Column
                    field="outstanding_balance"
                    header="Amount"
                    class="amount-column"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.outstanding_balance) }}
                    </template>
                </Column>
                <Column
                    field="pdf_path"
                    header="View"
                    class="text-center flex justify-center"
                >
                    <template #body="{ data }">
                        <Button
                            @click="openInvoicePreview(data)"
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
</template>
