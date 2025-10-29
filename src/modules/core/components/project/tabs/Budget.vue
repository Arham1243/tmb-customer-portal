<script setup>
import { onBeforeMount, ref } from 'vue';
import { useProjectStore } from '@/modules/core/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';

const projectStore = useProjectStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();

onBeforeMount(async () => {
    await getItems();
});

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
        const params = {
            ...pagination.getPageParams()
        };
        const payload = sortFilters.getSortFilters(searchText.value);
        const res = await projectStore.searchBudget(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};
</script>

<template>
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
            <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 sm:gap-4"
            >
                <div class="w-full sm:w-1/2 md:w-1/3 lg:w-1/3">
                    <Search
                        v-model="searchText"
                        @search="search"
                        class="w-full"
                    />
                </div>
            </div>
        </template>
        <template #empty>
            Will be developed once project tasks are finalized
        </template>
        <Column :sortable="true" field="name" header="Task" />
        <Column :sortable="true" field="name" header="Budgeted Hours" />
        <Column :sortable="true" field="name" header="Budgeted Avg. Rate" />
        <Column :sortable="true" field="name" header="Budgeted Amount" />
        <Column :sortable="true" field="name" header="Due Date" />
        <Column :sortable="true" field="name" header="Actual Hours" />
        <Column :sortable="true" field="name" header="Actual Avg. Rate" />
        <Column :sortable="true" field="name" header="Actual Amount" />
        <Column :sortable="true" field="name" header="Hours Variance" />
        <Column :sortable="true" field="name" header="Amount Variance" />
        <Column :sortable="true" field="name" header="Status" />
    </BaseTable>
</template>
