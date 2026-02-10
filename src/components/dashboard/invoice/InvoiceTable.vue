<script setup>
import { onBeforeMount, ref, computed } from 'vue';
import { useCustomerStore, useSessionStore } from '@/stores';
import { PaginationOptions } from '@/config';
import { useRouter } from 'vue-router';
import { useHelpers } from '@/composables';

const { formatDate, moneyFormat } = useHelpers();
const sessionStore = useSessionStore();
const customerStore = useCustomerStore();
const pagination = new PaginationOptions();
const loading = ref(false);
const items = ref([]);
const router = useRouter();
const totalRecords = ref();
const currentUser = sessionStore?.customer;
const totalOutstanding = sessionStore?.info?.total_outstanding;
const selectedItems = ref([]);
const searchText = ref('');

onBeforeMount(async () => {
    await getItems();
});

const totalSelected = computed(() => {
    return selectedItems.value.reduce(
        (total, item) => total + item.outstanding_balance,
        0
    );
});

const onPageChange = (event) => {
    pagination.updatePageParams(event);
    getItems();
};

const search = async () => {
    pagination.resetPageParams();
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
            field: 'payment_status',
            operator: 'in',
            value: ['unpaid', 'partially_paid']
        },
        {
            field: 'status',
            operator: '=',
            value: 'approved'
        }
    ];
    return filtersPayload;
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = {
            filters: makeFiltersPayload(),
            search: { value: searchText.value }
        };
        const res = await customerStore.searchInvoices(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const goToCheckout = () => {
    customerStore.setSelectedInvoices(selectedItems.value);
    pushRoute('Checkout');
};

const pushRoute = (routeName) => {
    router.push({ name: routeName });
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl mb-1 font-bold">Unpaid Invoices</h1>
                <p class="text-gray-500 mb-0 text-sm">
                    Total Unpaid Balance:
                    <strong class="text-black">{{
                        moneyFormat(totalOutstanding)
                    }}</strong>
                </p>
            </div>
        </template>
        <template #actions>
            <Button
                label="Pay now"
                size="medium"
                :disabled="selectedItems.length === 0 || loading"
                @click="goToCheckout"
            />
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <Message
                v-if="selectedItems.length > 0"
                severity="secondary"
                class="mb-8 py-3"
                >Total of Invoices to be paid:
                <strong class="text-primary">{{
                    moneyFormat(totalSelected)
                }}</strong></Message
            >
            <BaseTable
                v-model:selection="selectedItems"
                :value="items"
                :page="pagination.page"
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @page="onPageChange"
                :reorderableColumns="true"
            >
                <template #header>
                    <div class="flex justify-end mb-5">
                        <Search
                            v-model="searchText"
                            @search="search"
                            placeholder="Search by invoice #"
                            class="w-full sm:w-1/2 md:w-1/3 lg:w-1/3"
                        />
                    </div>
                </template>
                <template #empty> No invoices found. </template>

                <Column
                    selectionMode="multiple"
                    headerStyle="width: 3rem"
                    columnKey="selection"
                />

                <Column
                    field="invoice_number"
                    header="Invoice Number"
                    columnKey="invoice_number"
                />

                <Column
                    field="invoice_date"
                    header="Date"
                    columnKey="invoice_date"
                >
                    <template #body="{ data }">
                        {{ formatDate(data.invoice_date) }}
                    </template>
                </Column>

                <Column
                    field="outstanding_balance"
                    class="amount-column"
                    header="Outstanding Balance"
                    columnKey="outstanding_balance"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.outstanding_balance) }}
                    </template>
                </Column>
            </BaseTable>
        </template>
    </Card>
</template>
