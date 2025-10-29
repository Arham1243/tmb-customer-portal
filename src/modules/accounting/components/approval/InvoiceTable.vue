<script setup>
import { onBeforeMount, ref, computed } from 'vue';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useInvoiceStore } from '@/modules/accounting/stores';

const invoiceStore = useInvoiceStore();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const { formatDate, moneyFormat, formatHours } = useHelpers();

const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const selectedItems = ref([]);
const totalRecords = ref();
const approveDialog = ref(false);

const hasSelectedItems = computed(() => selectedItems.value.length > 0);

onBeforeMount(async () => {
    await getItems();
});

// Computed Totals
const totalBillableAmount = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.total_billable || 0),
        0
    );
});

const totalBillableHours = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.billable_hours || 0),
        0
    );
});

const totalChargeAmount = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.charge_amount || 0),
        0
    );
});

const totalBillableExpense = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.billable_expenses || 0),
        0
    );
});

const totalAdditionalItemsTotal = computed(() => {
    return items.value.reduce(
        (sum, item) => sum + (item.additional_items_total || 0),
        0
    );
});

// Handlers
const showApproveDialog = () => {
    approveDialog.value = true;
};

const approveSelected = async () => {
    try {
        loading.value = true;
        const resources = selectedItems.value.map((item) => item.id);
        // TODO: Call approve API with resources
        await getItems();
        selectedItems.value = [];
        approveDialog.value = false;
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const onSortChange = (event) => {
    pagination.resetPageParams();
    sortFilters.updateSortFilters(event);
    getItems();
};

const onPageChange = (event) => {
    pagination.updatePageParams(event);
    getItems();
};

const search = async () => {
    pagination.resetPageParams();
    sortFilters.updateSearch(searchText.value);
    getItems();
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [{ relation: 'customer' }],
            filters: [
                {
                    field: 'status',
                    operator: '=',
                    value: 'draft'
                }
            ]
        };

        if (!payload.sort || payload.sort.length === 0) {
            payload.sort = [{ field: 'created_at', direction: 'desc' }];
        }
        const res = await invoiceStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div
        class="mb-6 flex flex-col lg:flex-row items-center justify-between gap-4"
    >
        <div class="w-full lg:w-1/3 text-center lg:text-left">
            <h1 class="text-2xl lg:text-3xl font-bold">Invoices Approval</h1>
        </div>
    </div>
    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
                v-model:selection="selectedItems"
                :value="items"
                :page="pagination.page"
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @sort="onSortChange"
                @page="onPageChange"
            >
                <template #header>
                    <div
                        class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-5"
                    >
                        <div
                            class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
                        >
                            <Button
                                label="Approve Selected"
                                icon="pi pi-check"
                                severity="success"
                                :disabled="!hasSelectedItems || loading"
                                @click="showApproveDialog"
                                class="flex-1 sm:flex-none truncate text-center"
                            />
                        </div>
                        <div
                            class="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4 mt-3 sm:mt-0 w-full sm:w-auto"
                        >
                            <div class="w-full sm:w-64 md:w-80">
                                <Search
                                    v-model="searchText"
                                    @search="search"
                                    class="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem" />

                <Column
                    :sortable="true"
                    field="invoice_number"
                    header="Invoice Number"
                >
                    <template #body="{ data }">
                        <router-link
                            v-if="$ability.can('invoicing.approve.edit')"
                            :to="{
                                name: 'InvoiceApprovalDetails',
                                params: { id: data.id }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.invoice_number }}
                        </router-link>
                        <span v-else>{{ data.invoice_number }}</span>
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="invoice_date"
                    header="Invoice Date"
                >
                    <template #body="{ data }">
                        {{ formatDate(data.invoice_date) }}
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="customer.name"
                    header="Customer"
                    class="whitespace-nowrap"
                />
                <Column
                    field="total_billable"
                    header="Invoice Amount"
                    class="amount-column"
                    sortable
                >
                    <template #body="{ data }">{{
                        moneyFormat(data.total_billable)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalBillableAmount)
                        }}</span>
                    </template>
                </Column>
                <Column
                    field="billable_hours"
                    header="Billable Hours"
                    sortable
                    class="amount-column"
                >
                    <template #body="{ data }">{{
                        formatHours(data.billable_hours)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            formatHours(totalBillableHours)
                        }}</span>
                    </template>
                </Column>
                <Column
                    field="charge_amount"
                    header="Charge Amount"
                    class="amount-column"
                    sortable
                >
                    <template #body="{ data }">{{
                        moneyFormat(data.charge_amount)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalChargeAmount)
                        }}</span>
                    </template>
                </Column>
                <Column
                    field="billable_expenses"
                    header="Billable Expenses"
                    class="amount-column"
                    sortable
                >
                    <template #body="{ data }">{{
                        moneyFormat(data.billable_expenses)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalBillableExpense)
                        }}</span>
                    </template>
                </Column>
                <Column
                    field="additional_items_total"
                    header="Additional Items"
                    class="amount-column"
                    sortable
                >
                    <template #body="{ data }">{{
                        moneyFormat(data.additional_items_total)
                    }}</template>
                    <template #footer>
                        <span class="font-semibold text-lg">{{
                            moneyFormat(totalAdditionalItemsTotal)
                        }}</span>
                    </template>
                </Column>

                <template #empty> No invoices found. </template>
            </BaseTable>
        </template>
    </Card>

    <TypeConfirmation
        v-model="approveDialog"
        header="Approve Invoices"
        :message="`Are you sure you want to approve ${selectedItems.length} selected invoice(s)?`"
        @confirm="approveSelected"
    />
</template>
