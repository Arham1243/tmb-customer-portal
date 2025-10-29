<script setup>
import { ref, onBeforeMount, watch } from 'vue';
import TimesheetDayTable from './day/TimesheetDayTable.vue';
import TimesheetWeekTable from './week/TimesheetWeekTable.vue';
import { useUserRole } from '@/composables/useUserRole';
import { useSessionStore } from '@/stores';
import { useUserStore } from '@/modules/administration/stores';
import { useRouter, useRoute } from 'vue-router';

const { isAdmin, isApprover } = useUserRole();
const sessionStore = useSessionStore();
const userStore = useUserStore();
const router = useRouter();
const route = useRoute();
const loadingUsers = ref(false);
const users = ref([]);
const myCompanyTimeSheetStart = ref(sessionStore.myCompany?.timesheet_start);
const timesheetValidModes = ['weekly', 'daily'];
const timesheetCompanyDefault = timesheetValidModes.includes(
    myCompanyTimeSheetStart.value
)
    ? myCompanyTimeSheetStart.value
    : 'weekly';

const timesheetInitialMode = timesheetValidModes.includes(route.query.mode)
    ? route.query.mode
    : timesheetCompanyDefault;

const timesheetMode = ref(timesheetInitialMode);

const timesheetModeOptions = [
    { label: 'Week', value: 'weekly' },
    { label: 'Day', value: 'daily' }
];

const selectedUser = ref(sessionStore.user?.id);

watch(
    () => timesheetMode.value,
    (newMode) => {
        router.push({
            ...route,
            query: {
                ...route.query,
                mode: newMode
            }
        });
    }
);

onBeforeMount(async () => {
    await getUsers();
});

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
    } finally {
        loadingUsers.value = false;
    }
};
</script>

<template>
    <div
        class="mb-6 flex flex-col lg:flex-row items-center justify-between gap-4"
    >
        <div class="w-full lg:w-1/3 text-center lg:text-left">
            <h1 class="text-2xl lg:text-3xl font-bold">Timesheets</h1>
        </div>

        <div class="w-full lg:w-1/3 flex justify-center">
            <SelectButton
                size="large"
                v-model="timesheetMode"
                :options="timesheetModeOptions"
                optionLabel="label"
                optionValue="value"
            />
        </div>

        <div class="w-full lg:w-1/3 flex justify-center lg:justify-end">
            <ApiDropdown
                filter
                placeholder="Select User"
                :loading="loadingUsers"
                @search="getUsers"
                :options="users"
                optionLabel="name"
                optionValue="id"
                id="user_id"
                class="w-full sm:w-64 lg:w-80"
                v-model="selectedUser"
                :disabled="loadingUsers || (!isAdmin && !isApprover)"
            />
        </div>
    </div>

    <TimesheetWeekTable
        v-if="timesheetMode === 'weekly'"
        :selectedUser="selectedUser"
    />
    <TimesheetDayTable v-else :selectedUser="selectedUser" />
</template>
