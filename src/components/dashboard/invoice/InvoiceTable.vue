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
const currentUser = sessionStore?.user;
const totalOutstanding = sessionStore?.info?.total_outstanding;
const selectedItems = ref([]);

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
            filters: makeFiltersPayload()
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
                selectionMode="multiple"
                v-model:selection="selectedItems"
                :value="items"
                :page="pagination.page"
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @page="onPageChange"
            >
                <template #empty> No invoices found. </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem" />

                <Column field="invoice_number" header="Invoice Number" />

                <Column field="invoice_date" header="Date">
                    <template #body="{ data }">
                        {{ formatDate(data.invoice_date) }}
                    </template>
                </Column>

                <Column
                    field="outstanding_balance"
                    class="amount-column"
                    header="Outstanding Balance"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.outstanding_balance) }}
                    </template>
                </Column>
            </BaseTable>
        </template>
    </Card>
</template>
