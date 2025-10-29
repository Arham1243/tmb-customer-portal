<script setup>
import { onBeforeMount, ref, computed } from 'vue';
import { useReceiptStore } from '@/modules/accounting/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { paymentTypes } from '@/config/enums';
import { useRouter } from 'vue-router';

const { moneyFormat, formatDate } = useHelpers();
const router = useRouter();
const receiptStore = useReceiptStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const selectedItem = ref({});
const menu = ref();
const totalRecords = ref();

onBeforeMount(async () => {
    await getItems();
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Export',
            icon: 'pi pi-file-pdf',
            command: () => exportItem()
        }
    ];

    return allMenuItems;
});

const exportItem = () => {
    console.log(selectedItem.value);
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
            includes: [
                { relation: 'paymentMethod' },
                { relation: 'customer' },
                { relation: 'deductionType' }
            ]
        };
        const res = await receiptStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const pushRoute = (name) => {
    router.push({ name });
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">Payment Receipts</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    Record and track customer payments
                </p>
            </div>
        </template>
        <template #actions>
            <Button
                v-if="$ability.can('receipts.create')"
                label="Create Receipt"
                @click="pushRoute('ReceiptsGenerate')"
            />
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
                    <div class="flex justify-end mb-5">
                        <Search
                            v-model="searchText"
                            @search="search"
                            class="w-full sm:w-1/2 md:w-1/3 lg:w-1/3"
                        />
                    </div>
                </template>
                <template #empty> No receipts found. </template>

                <Column
                    :sortable="true"
                    field="reference_number"
                    header="Reference Number"
                >
                    <template #body="{ data }">
                        <router-link
                            :to="{
                                name: 'ReceiptsDetails',
                                params: { id: data.id }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.reference_number }}
                        </router-link>
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="receipt_date"
                    header="Receipt Date"
                >
                    <template #body="{ data }">
                        {{ formatDate(data.receipt_date) }}
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="amount_received"
                    header="Amount Received"
                    class="amount-column"
                >
                    <template #body="{ data }">
                        {{ moneyFormat(data.amount_received) }}
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="payment_type"
                    header="Payment Type"
                >
                    <template #body="{ data }">
                        {{
                            paymentTypes.find(
                                (p) => p.code === data.payment_type
                            )?.name || '-'
                        }}
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="paymentMethod.name"
                    header="Payment Method"
                />
                <Column
                    :sortable="true"
                    field="reference_number"
                    header="Reference Number"
                />
                <Column
                    :sortable="true"
                    field="customer.name"
                    header="Customer"
                />
                <Column
                    :sortable="true"
                    field="deductionType.name"
                    header="Deduction Type"
                />
                <Column header="Actions" class="flex justify-end">
                    <template #body="{ data }">
                        <Button
                            class="!px-3 !py-2"
                            label="Actions"
                            variant="outlined"
                            iconPos="right"
                            icon="pi pi-chevron-down"
                            size="small"
                            @click="showActions($event, data)"
                        />

                        <Menu
                            ref="menu"
                            id="overlay_menu"
                            :model="menuItems"
                            :popup="true"
                        />
                    </template>
                </Column>
            </BaseTable>
        </template>
    </Card>
</template>
