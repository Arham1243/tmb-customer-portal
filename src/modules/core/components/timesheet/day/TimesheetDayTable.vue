<script setup>
import dayjs from '@/plugins/dayjs';
import { onBeforeMount, ref, computed, watch } from 'vue';
import { useTimesheetStore } from '@/modules/core/stores';
import { useExportTable } from '@/composables/useExportTable';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useRouter } from 'vue-router';
import { useUserRole } from '@/composables/useUserRole';
import { useSessionStore } from '@/stores';

const { isApprover, isAdmin } = useUserRole();
const sessionStore = useSessionStore();
const router = useRouter();

const props = defineProps({
    selectedUser: {
        type: [String, null],
        required: true
    }
});

const timesheetStore = useTimesheetStore();
const { exportTable } = useExportTable();
const { formatDate, formatHours } = useHelpers();
const exportMenu = ref(null);
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const selectedUser = computed(() => props.selectedUser);
const loading = ref(false);
const applyingFilters = ref(false);
const items = ref([]);
const dateRange = ref([]);
const totalRecords = ref(0);

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () =>
            exportData({
                table: 'timesheets',
                format: 'excel',
                columns: ['date', 'input_hours', 'status']
            })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () =>
            exportData({
                table: 'timesheets',
                format: 'pdf',
                columns: ['date', 'input_hours', 'status']
            })
    }
];

watch(selectedUser, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) getItems();
});

onBeforeMount(async () => {
    await getItems();
});

const showExportMenu = (event) => exportMenu.value.toggle(event);
const exportData = async ({ table, format, columns }) => {
    try {
        loading.value = true;
        await exportTable({
            table,
            format,
            user_id: selectedUser.value,
            columns,
            merge_by_day: true
        });
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

const applyFilters = async () => {
    try {
        applyingFilters.value = true;
        await getItems();
    } finally {
        applyingFilters.value = false;
    }
};

const getItems = async () => {
    if (!selectedUser.value) return;
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams(), merge_by_day: true };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            filters: [
                { field: 'user_id', operator: '=', value: selectedUser.value }
            ],
            customFilters: []
        };

        if (dateRange.value) {
            payload.customFilters.push({
                field: 'date_range',
                value: dateRange.value
            });
        }

        const res = await timesheetStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const canAddTimesheet = computed(() => {
    // Admin can add timesheets for anyone
    if (isAdmin.value) return true;

    // Approvers can only add timesheets for themselves
    if (isApprover.value) {
        return selectedUser.value === sessionStore.user.id;
    }

    // Regular users can add their own timesheets
    return true;
});

const pushRoute = (name, params = {}) => router.push({ name, params });

function formatDateForUrl(date) {
    return dayjs.utc(date).format('YYYY-MM-DD');
}
</script>

<template>
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
                    <div class="flex flex-col sm:flex-row gap-4 mb-5">
                        <!-- Left half: Search, Date Range, Apply -->
                        <div
                            class="flex flex-col sm:flex-row w-full sm:w-7/12 gap-4 items-start sm:items-center"
                        >
                            <Search
                                v-model="searchText"
                                @search="search"
                                class="w-full sm:w-64"
                            />

                            <InputField
                                class="timesheet-range-picker"
                                placeholder="Select Date Range"
                                :disabled="applyingFilters"
                                v-model="dateRange"
                                :range="true"
                                variant="date"
                            />
                            <Button
                                label="Apply"
                                @click="applyFilters"
                                :loading="applyingFilters"
                            />
                        </div>

                        <!-- Right half: Export, Add New -->
                        <div
                            class="flex flex-col sm:flex-row w-full sm:w-5/12 gap-4 items-start sm:items-center justify-end"
                        >
                            <Button
                                label="Export"
                                icon="pi pi-download"
                                variant="outlined"
                                size="medium"
                                @click="showExportMenu($event)"
                                :disabled="items.length === 0 || loading"
                            />
                            <Menu
                                ref="exportMenu"
                                :model="exportMenuItems"
                                :popup="true"
                            />
                            <Button
                                v-if="
                                    canAddTimesheet &&
                                    $ability.can('timesheets.create')
                                "
                                label="Add"
                                @click="
                                    pushRoute('TimesheetAddDay', {
                                        user_id: selectedUser
                                    })
                                "
                            />
                        </div>
                    </div>
                </template>

                <template #empty>
                    <div v-if="!selectedUser">
                        Please select a user to view timesheets.
                    </div>
                    <div v-else>No timesheets found.</div>
                </template>

                <Column field="date" header="Date" :sortable="true">
                    <template #body="{ data }">
                        <router-link
                            :to="{
                                name: 'TimesheetEditDay',
                                params: {
                                    user_id: data.user_id,
                                    date: formatDateForUrl(data.date)
                                }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ formatDate(data.date) }}
                        </router-link>
                    </template>
                </Column>

                <Column field="input_hours" header="Hours" :sortable="true">
                    <template #body="{ data }">
                        {{ formatHours(data.input_hours) }}
                    </template>
                </Column>
                <Column field="status" header="Status" :sortable="true">
                    <template #body="{ data }">
                        <StatusTag :status="data.status" />
                    </template>
                </Column>
            </BaseTable>
        </template>
    </Card>
</template>
