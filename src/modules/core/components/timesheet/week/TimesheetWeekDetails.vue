<script setup>
import dayjs from '@/plugins/dayjs';
import { groupBy } from 'lodash-es';
import { computed, ref, watch, onBeforeMount } from 'vue';
import { useUserStore } from '@/modules/administration/stores';
import { useUserRole } from '@/composables/useUserRole';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useTimesheetStore } from '@/modules/core/stores';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import { weekDays } from '@/config/enums';
import { useSessionStore } from '@/stores';
import { useHelpers } from '@/composables/useHelpers';
import TimesheetWeekDialog from './TimesheetWeekDialog.vue';

const props = defineProps({
    isTimesheetEdit: {
        type: Boolean,
        default: false
    }
});

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const route = useRoute();
const userStore = useUserStore();
const timesheetStore = useTimesheetStore();
const router = useRouter();
const sessionStore = useSessionStore();
const { isAdmin, isApprover } = useUserRole();
const { moneyFormat, formatHours } = useHelpers();

const dialogRef = ref(null);
const selectedUser = ref(null);
const selectedUserId = ref(route.params.user_id ? route.params.user_id : null);
const isTimesheetEdit = ref(props.isTimesheetEdit);
const loading = ref(false);
const selectedItem = ref(null);
const submitDialog = ref(false);
const searchText = ref('');
const users = ref([]);
const allTimesheets = ref([]);
const selectedDate = ref('');
const showDialog = ref(false);
const timesheetInitialMode = 'weekly';
const timesheetMode = ref(timesheetInitialMode);
const draftTimesheetsCount = ref(0);

const myCompanyWeekBegins = ref(sessionStore.myCompany?.week_begins);
const myCompanyWeekBeginsFormat = ref(
    sessionStore.myCompany?.weekly_timesheet_date_format
);
const loadingUsers = ref(false);
const timesheetModeOptions = [
    { label: 'Week', value: 'weekly' },
    { label: 'Day', value: 'daily' }
];
const today = new Date();

const disableFutureDates = (date) => {
    return date > today;
};

onBeforeMount(async () => {
    await getItems();
});

watch(
    () => timesheetMode.value,
    () => {
        navigateTimesheet();
    }
);

onBeforeMount(async () => {
    const rawDate = route.query.date || dayjs().format('YYYY-MM-DD');
    selectedDate.value = getWeekStartDate(rawDate);
    await getUsers();
});

const isViewingOwnTimesheets = computed(() => {
    return selectedUserId.value == sessionStore.user.id;
});

const displayDateFormat = computed(() =>
    myCompanyWeekBeginsFormat.value === 'mm/dd' ? 'MM/DD' : 'DD/MM'
);

const canAddTimesheet = computed(() => {
    // Admin can add timesheets for anyone
    if (isAdmin.value) return true;

    // Approvers can only add timesheets for themselves
    if (isApprover.value) return isViewingOwnTimesheets.value;

    // Regular users can add their own timesheets
    return true;
});

const weekList = computed(() => {
    if (!selectedDate.value) return [];

    const startDayIndex = weekDays.findIndex(
        (d) => d.code === myCompanyWeekBegins.value
    );
    let startOfWeek = dayjs(selectedDate.value)
        .startOf('week')
        .add(startDayIndex, 'day');

    if (startOfWeek.isAfter(dayjs(selectedDate.value))) {
        startOfWeek = startOfWeek.subtract(7, 'day');
    }

    const orderedWeekDays = [
        ...weekDays.slice(startDayIndex),
        ...weekDays.slice(0, startDayIndex)
    ];

    return orderedWeekDays.map((d, idx) => {
        const date = startOfWeek.add(idx, 'day');
        return {
            ...d,
            date: date.format('YYYY-MM-DD'),
            label: `${d.code}\n${date.format('D/M')}`
        };
    });
});

const getWeekStartDate = (date) => {
    const startDayIndex = weekDays.findIndex(
        (d) => d.code === myCompanyWeekBegins.value
    );
    let startOfWeek = dayjs(date).startOf('week').add(startDayIndex, 'day');

    if (startOfWeek.isAfter(dayjs(date))) {
        startOfWeek = startOfWeek.subtract(7, 'day');
    }

    return startOfWeek.format('YYYY-MM-DD');
};

const weekTotals = computed(() => {
    const totals = {};

    weekList.value.forEach((day) => {
        totals[day.date] = items.value.reduce(
            (sum, item) => sum + (item[day.date] || 0),
            0
        );
    });

    totals.total_hours = items.value.reduce(
        (sum, i) => sum + (i.total_hours || 0),
        0
    );
    totals.total_billable_hours = items.value.reduce(
        (sum, i) => sum + (i.total_billable_hours || 0),
        0
    );
    totals.total_charge_amount = items.value.reduce(
        (sum, i) => sum + (i.total_charge_amount || 0),
        0
    );

    return totals;
});

const columnTotals = computed(() => {
    const totals = {
        total_hours: 0,
        total_billable_hours: 0,
        total_charge_amount: 0
    };

    items.value.forEach((item) => {
        totals.total_hours += Number(item.total_hours || 0);
        totals.total_billable_hours += Number(item.total_billable_hours || 0);
        totals.total_charge_amount += Number(item.total_charge_amount || 0);
    });

    return totals;
});

function showSubmitDialog() {
    submitDialog.value = true;
}

function pushRoute(name, params = {}, query = {}) {
    router.push({ name, params, query });
}

function transformRowDataForDialog(rowData) {
    // Transform entries array to entries object keyed by date
    const entriesObject = {};

    if (rowData.entries && Array.isArray(rowData.entries)) {
        rowData.entries.forEach((entry) => {
            const dateKey = dayjs.utc(entry.date).format('YYYY-MM-DD');
            const entryData = {
                date: dateKey,
                status: entry.status || 'draft',
                description: entry.description || '',
                input_hours: entry.input_hours || 0,
                billable_hours: entry.billable_hours || 0,
                billing_rate: entry.billing_rate || 0,
                charge_rate: entry.charge_rate || 0,
                original_charge_rate: entry.original_charge_rate || 0,
                charge_amount: entry.charge_amount || 0,
                billing_status: entry.billing_status || 'unbilled',
                is_billable: entry.is_billable ?? true,
                is_reportable: entry.is_reportable ?? true
            };

            // Include timesheet_id for edit mode (when entry has an id)
            if (entry.id) {
                entryData.timesheet_id = entry.id;
            }

            entriesObject[dateKey] = entryData;
        });
    }

    return {
        status: rowData.status || 'draft',
        billing_status: rowData.billing_status || 'unbilled',
        customer_id: rowData.customer_id || null,
        project_id: rowData.project_id || null,
        project_task_id: rowData.project_task_id || null,
        entries: entriesObject
    };
}

async function onCellClick(event, dayDate = null) {
    // Transform the row data to match dialog's expected format
    selectedItem.value = transformRowDataForDialog(event.data);

    // Always open in edit mode - the dialog will handle per-day status checks
    const mode = 'edit';

    // Find the tab index for the clicked day
    let tabIndex = 0;
    if (dayDate) {
        tabIndex = weekList.value.findIndex((day) => day.date === dayDate);
        if (tabIndex === -1) tabIndex = 0;
    }

    showDialog.value = true;
    await dialogRef.value.openDialog(mode, tabIndex);
    await dialogRef.value.populateFormData();
}

const navigateTimesheet = () => {
    if (!selectedUserId.value) return;

    if (isTimesheetEdit.value) {
        if (timesheetMode.value === 'daily') {
            router.push({
                name: 'TimesheetEditDay',
                params: {
                    user_id: selectedUserId.value,
                    date: route.params.date || dayjs().format('YYYY-MM-DD')
                }
            });
        } else {
            router.push({
                name: 'TimesheetWeekly',
                params: {
                    user_id: selectedUserId.value
                },
                query: {
                    date: route.params.date
                }
            });
        }
    } else {
        if (timesheetMode.value === 'daily') {
            router.push({
                name: 'TimesheetAddDay',
                params: { user_id: selectedUserId.value }
            });
        } else {
            router.push({
                name: 'TimesheetWeekly',
                params: { user_id: selectedUserId.value }
            });
        }
    }
};

function transformTimesheets(data, weekList) {
    const grouped = groupBy(
        data,
        (t) => `${t.customer_id}_${t.project_id}_${t.project_task_id}`
    );

    return Object.values(grouped).map((entries) => {
        const base = entries[0];
        const row = {
            id: base.id,
            customer_id: base.customer_id,
            project_id: base.project_id,
            project_task_id: base.project_task_id,
            status: base.status,
            billing_status: base.billing_status,
            customer: base.customer?.name || '',
            project: base.project?.name || '',
            projectTask: base.projectTask?.name || '',
            total_hours: 0,
            total_billable_hours: 0,
            total_charge_amount: 0,
            entries: entries // Store original entries for dialog
        };

        weekList.forEach((day) => {
            // Find entries for this specific day
            const sameDayEntries = entries.filter((e) => {
                return dayjs.utc(e.date).format('YYYY-MM-DD') === day.date;
            });

            const dayHours = sameDayEntries.reduce(
                (sum, e) => sum + (e.input_hours || 0),
                0
            );
            const dayBillable = sameDayEntries.reduce(
                (sum, e) => sum + (e.billable_hours || 0),
                0
            );
            const dayCharge = sameDayEntries.reduce(
                (sum, e) => sum + (e.charge_amount || 0),
                0
            );

            // Get the status for this day (use first entry's status if multiple entries)
            const dayStatus =
                sameDayEntries.length > 0 ? sameDayEntries[0].status : null;

            row[day.date] = dayHours;
            row[`${day.date}_status`] = dayStatus;
            row.total_hours += dayHours;
            row.total_billable_hours += dayBillable;
            row.total_charge_amount += dayCharge;
        });

        return row;
    });
}

const getItems = async () => {
    if (!selectedUserId.value) {
        allTimesheets.value = [];
        loading.value = false;
        return;
    }

    try {
        loading.value = true;
        const params = {
            limit: 100000000
        };

        // base payload - fetch all timesheets for the user
        const payload = {
            search: { value: searchText.value },
            includes: [
                { relation: 'projectTask' },
                { relation: 'customer' },
                { relation: 'project' }
            ],
            filters: [
                {
                    field: 'user_id',
                    operator: '=',
                    value: selectedUserId.value
                }
            ]
        };

        const res = await timesheetStore.search(payload, params);
        allTimesheets.value = res.data || [];
        draftTimesheetsCount.value = allTimesheets.value.filter(
            (t) => t.status === 'draft' && (t.input_hours || 0) > 0
        ).length;
    } finally {
        loading.value = false;
    }
};

// Computed property to filter timesheets by selected week
const items = computed(() => {
    if (!allTimesheets.value.length || !weekList.value.length) {
        return [];
    }

    const weekStart = weekList.value[0]?.date;
    const weekEnd = weekList.value[weekList.value.length - 1]?.date;

    // Filter timesheets that fall within the selected week
    const weekTimesheets = allTimesheets.value.filter((timesheet) => {
        const timesheetDate = dayjs.utc(timesheet.date).format('YYYY-MM-DD');
        return timesheetDate >= weekStart && timesheetDate <= weekEnd;
    });

    return transformTimesheets(weekTimesheets, weekList.value);
});

const submitDraftTimesheets = async () => {
    try {
        loading.value = true;
        const payload = {
            user_id: selectedUserId.value
        };

        await timesheetStore.submitDraftTimesheets(payload);
        await getItems();
        selectedItem.value = {};
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const openAddDialog = async () => {
    showDialog.value = true;
    await dialogRef.value.openDialog('add');
};

const search = async () => {
    pagination.resetPageParams();
    sortFilters.updateSearch(searchText.value);
    getItems();
};

const onUserChange = async () => {
    if (!selectedUserId.value) return;

    if (selectedUserId.value !== route.params.user_id) {
        await router.push({
            ...route,
            params: {
                ...route.params,
                user_id: selectedUserId.value
            }
        });
    }

    await getItems();
};

const onDateChange = async (event) => {
    const weekStart = getWeekStartDate(event);
    selectedDate.value = weekStart;

    if (weekStart !== route.query.date) {
        await router.push({
            ...route,
            query: {
                ...route.query,
                date: weekStart
            }
        });
    }
};

const getUsers = async (searchText = '') => {
    try {
        loadingUsers.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            filters: [{ field: 'status', operator: '=', value: 'active' }],
            customFilters: [{ field: 'role_based_user', value: true }]
        };
        const res = await userStore.list(payload, params);
        users.value = [sessionStore.user, ...res.data];
        selectedUser.value = users.value.find(
            (u) => u.id == selectedUserId.value
        );
    } finally {
        loadingUsers.value = false;
    }
};
</script>
<template>
    <div class="grid grid-cols-1 md:grid-cols-3 items-center w-full gap-4 mb-7">
        <div class="flex items-center gap-5 justify-start">
            <Button
                variant="outlined"
                icon="pi pi-chevron-left"
                size="large"
                @click="pushRoute('Timesheets', {}, { mode: 'weekly' })"
                iconClass="!text-sm"
            />
            <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                Timesheets
            </h1>
        </div>

        <div class="flex justify-center gap-4">
            <SelectButton
                size="large"
                v-model="timesheetMode"
                :options="timesheetModeOptions"
                optionLabel="label"
                optionValue="value"
            />
        </div>

        <div class="flex justify-center md:justify-end">
            <ApiDropdown
                filter
                placeholder="Select"
                :loading="loadingUsers"
                @search="getUsers"
                @change="onUserChange"
                :options="users"
                optionLabel="name"
                optionValue="id"
                id="user_id"
                class="w-full sm:w-64 md:w-80"
                v-model="selectedUserId"
                :disabled="loadingUsers || (!isAdmin && !isApprover)"
            />
        </div>
    </div>
    <Card>
        <template #title>
            <div class="flex flex-col gap-4">
                <div class="flex flex-wrap items-end justify-between gap-4">
                    <div class="flex flex-col w-52">
                        <label class="text-sm font-medium text-gray-700 mb-1">
                            Week Starting
                        </label>
                        <InputField
                            :disabled="loading"
                            placeholder="Select Date"
                            v-model="selectedDate"
                            variant="date"
                            :clearable="false"
                            @change="onDateChange"
                            :disabled-date="disableFutureDates"
                            :max="today"
                        />
                    </div>

                    <div class="flex gap-3 w-full md:w-auto justify-end">
                        <Button
                            v-if="
                                $ability.can('timesheets.create') &&
                                canAddTimesheet
                            "
                            label="Add"
                            @click="openAddDialog"
                        />
                        <Button
                            v-if="canAddTimesheet"
                            label="Submit Timesheet"
                            severity="success"
                            v-tooltip.top="
                                draftTimesheetsCount === 0
                                    ? 'No draft timesheets'
                                    : undefined
                            "
                            :disabled="draftTimesheetsCount === 0"
                            @click="showSubmitDialog"
                        />
                    </div>
                </div>
            </div>
        </template>

        <template #content>
            <BaseTableClient
                :value="items"
                :paginator="false"
                :loading="loading"
            >
                <template #header>
                    <div class="pb-4">
                        <Search
                            v-model="searchText"
                            @search="search"
                            class="w-full md:w-1/3"
                            placeholder="Search project, task, or customer"
                        />
                    </div>
                </template>
                <template #empty> No timesheets found</template>
                <Column class="whitespace-nowrap" field="customer">
                    <template #header>
                        <div
                            class="flex flex-col items-center justify-between gap-4"
                        >
                            <div class="font-bold opacity-0">_</div>
                            <div class="flex flex-col items-center px-3 py-1">
                                <span class="text-lg font-bold">Customer</span>
                                <span class="text-sm text-gray-500">Name</span>
                            </div>
                        </div>
                    </template>
                    <template #body="{ data }"> {{ data.customer }} </template>
                </Column>

                <Column class="whitespace-nowrap" field="project">
                    <template #header>
                        <div
                            class="flex flex-col items-center justify-between gap-4"
                        >
                            <div class="font-bold opacity-0">_</div>
                            <div class="flex flex-col items-center px-3 py-1">
                                <span class="text-lg font-bold">Project</span>
                                <span class="text-sm text-gray-500">Name</span>
                            </div>
                        </div>
                    </template>
                    <template #body="{ data }">
                        {{ data.project }}
                    </template>
                </Column>

                <Column class="whitespace-nowrap" field="projectTask">
                    <template #header>
                        <div
                            class="flex flex-col items-center justify-between gap-4"
                        >
                            <div class="font-bold opacity-0">_</div>
                            <div class="flex flex-col items-center px-3 py-1">
                                <span class="text-lg font-bold">Project</span>
                                <span class="text-sm text-gray-500">Task</span>
                            </div>
                        </div>
                    </template>
                    <template #body="{ data }">
                        {{ data.projectTask }}
                    </template>
                </Column>

                <Column
                    v-for="(day, i) in weekList"
                    :key="day.date"
                    :field="day.date"
                    class="text-align-center"
                >
                    <template #header>
                        <div
                            class="flex flex-col items-center justify-between gap-4"
                        >
                            <div class="font-bold">
                                {{ formatHours(weekTotals[day.date] || 0) }}
                            </div>
                            <div
                                class="flex flex-col items-center px-3 py-1"
                                :class="{
                                    'bg-blue-100 text-blue-700 rounded-md':
                                        day.date === weekList[0].date
                                }"
                            >
                                <span class="text-lg font-bold">{{
                                    dayjs(day.date).format('ddd')
                                }}</span>
                                <span class="text-sm text-gray-500">{{
                                    dayjs(day.date).format(displayDateFormat)
                                }}</span>
                            </div>
                        </div>
                    </template>
                    <template #body="{ data }">
                        <div class="flex flex-col items-center gap-1">
                            <span
                                @click="onCellClick({ data }, day.date)"
                                class="text-blue-600 hover:text-blue-800 cursor-pointer"
                                >{{ formatHours(data[day.date] || 0) }}</span
                            >
                            <StatusTag
                                v-if="
                                    data[`${day.date}_status`] &&
                                    (data[day.date] || 0) > 0
                                "
                                :status="data[`${day.date}_status`]"
                                class="text-xs"
                            />
                        </div>
                    </template>
                </Column>
                <Column class="text-align-center" field="total_hours">
                    <template #header>
                        <div
                            class="flex flex-col items-center justify-between gap-4"
                        >
                            <div class="font-bold">
                                {{ formatHours(columnTotals.total_hours) }}
                            </div>
                            <div class="flex flex-col items-center px-3 py-1">
                                <span class="text-lg font-bold">Total</span>
                                <span class="text-sm text-gray-500">Hours</span>
                            </div>
                        </div>
                    </template>
                    <template #body="{ data }">
                        {{ formatHours(data.total_hours) }}
                    </template>
                </Column>
                <Column
                    class="text-align-center"
                    field="total_billable_hours"
                    v-if="isApprover || isAdmin"
                >
                    <template #header>
                        <div
                            class="flex flex-col items-center justify-between gap-4"
                        >
                            <div class="font-bold">
                                {{
                                    formatHours(
                                        columnTotals.total_billable_hours
                                    )
                                }}
                            </div>
                            <div class="flex flex-col items-center px-3 py-1">
                                <span class="text-lg font-bold">Billable </span>
                                <span class="text-sm text-gray-500">Hours</span>
                            </div>
                        </div>
                    </template>
                    <template #body="{ data }">
                        {{ formatHours(data.total_billable_hours) }}
                    </template>
                </Column>
                <Column
                    class="amount-column"
                    field="total_charge_amount"
                    v-if="isApprover || isAdmin"
                >
                    <template #header>
                        <div
                            class="flex flex-col items-center justify-between gap-4"
                        >
                            <div class="font-bold">
                                {{
                                    moneyFormat(
                                        columnTotals.total_charge_amount
                                    )
                                }}
                            </div>
                            <div class="flex flex-col items-center px-3 py-1">
                                <span class="text-lg font-bold">Charge </span>
                                <span class="text-sm text-gray-500"
                                    >Amount</span
                                >
                            </div>
                        </div>
                    </template>
                    <template #body="{ data }">
                        {{ moneyFormat(data.total_charge_amount) }}
                    </template>
                </Column>
            </BaseTableClient>
        </template>
    </Card>

    <Confirmation
        v-model="submitDialog"
        variant="success"
        header="Submit Draft Timesheets"
        content="Are you sure you want to submit all draft timesheets?"
        @confirm="submitDraftTimesheets"
    />

    <TimesheetWeekDialog
        ref="dialogRef"
        v-model:visible="showDialog"
        :selectedItem="selectedItem"
        :selectedUserId="selectedUserId"
        :selectedUser="selectedUser"
        :weekList="weekList"
        @reload="getItems"
    />
</template>
<style>
th.text-align-center .p-datatable-column-header-content {
    justify-content: center;
}
td.text-align-center {
    text-align: center !important;
}
th.align-bottom {
    vertical-align: bottom;
    padding-bottom: 2rem !important;
}
/* Prevent row hover effects since we're using cell-level clicks */
:deep(.p-datatable-tbody > tr) {
    cursor: default !important;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: transparent !important;
}
</style>
