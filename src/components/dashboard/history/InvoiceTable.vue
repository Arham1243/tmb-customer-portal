<script setup>
import { onBeforeMount, ref } from 'vue';
import { useCustomerStore } from '@/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';

const { formatDate, moneyFormat } = useHelpers();

const customerStore = useCustomerStore();
const globalStore = useGlobalStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const menu = ref();
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
onBeforeMount(async () => {
    await getItems();
});

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

const exportFilteredReport = async ({ resource, format }) => {
    try {
        loading.value = true;

        const filtersPayload = makeFiltersPayload();
        const customFilters = makeCustomFiltersPayload();

        const payload = {
            format,
            columns: visibleColumns.value.map((c) => c.field),
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

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = sortFilters.getSortFilters(searchText.value);
        const res = await customerStore.searchInvoices(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">
                    Transaction History
                </h1>
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
                @sort="onSortChange"
                @page="onPageChange"
            >
                <template #header>
                    
                </template>
                <template #empty> No invoices found. </template>
                <Column
                    :sortable="true"
                    field="invoice_number"
                    header="Invoice Number"
                />

                <Column :sortable="true" field="date" header="Transaction Type">
                    <template #body="{ data }">
                        <StatusTag
                            :status="data.status ? 'paid' : 'inactive'"
                        />
                    </template>
                </Column>

                <Column :sortable="true" field="date" header="Date">
                    <template #body="{ data }">
                        {{ formatDate(data.date) }}
                    </template>
                </Column>

                <Column
                    :sortable="true"
                    field="outstanding_balance"
                    header="Amount"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.outstanding_balance) }}
                    </template>
                </Column>
                <Column field="pdf_path" header="View">
                    <template #body="{ data }">
                        <Button
                            v-if="data.pdf_path"
                            as="a"
                            :href="data.pdf_path"
                            target="_blank"
                            rounded
                            variant="outlined"
                            icon="pi pi-eye"
                            size="small"
                            class="mx-auto !flex"
                        />
                    </template>
                </Column>
            </BaseTable>
        </template>
    </Card>
</template>
