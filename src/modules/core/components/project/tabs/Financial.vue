<script setup>
import { onBeforeMount, ref } from 'vue';
import { useProjectStore } from '@/modules/core/stores';
import { useExportTable } from '@/composables/useExportTable';
import { PaginationOptions, SortFilterOptions } from '@/config';

const projectStore = useProjectStore();

const { exportTable } = useExportTable();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const exportMenu = ref(null);

onBeforeMount(async () => {
    await getItems();
});

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () => ''
        // command: () =>
        //     exportData({ table: 'project_financials', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () => ''
        // command: () =>
        //     exportData({ table: 'project_financials', format: 'pdf' })
    }
];

const showExportMenu = (event) => {
    exportMenu.value.toggle(event);
};

const exportData = async ({ table, format }) => {
    try {
        loading.value = true;
        await exportTable({ table, format });
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
        const params = {
            ...pagination.getPageParams()
        };
        const payload = sortFilters.getSortFilters(searchText.value);
        const res = await projectStore.searchFinancials(payload, params);
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

                <div class="flex flex-row gap-2 items-center mt-2 sm:mt-0">
                    <Button
                        label="Export"
                        icon="pi pi-download"
                        size="medium"
                        @click="showExportMenu($event)"
                    />
                    <Menu
                        ref="exportMenu"
                        :model="exportMenuItems"
                        :popup="true"
                    />
                </div>
            </div>
        </template>
        <template #empty> To be developed in the reporting phase. </template>
        <Column :sortable="true" field="name" header="Name" />
    </BaseTable>
</template>
