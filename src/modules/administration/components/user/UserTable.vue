<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useUserStore } from '@/modules/administration/stores';
import { useExportTable } from '@/composables/useExportTable';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useRouter } from 'vue-router';

const helpers = useHelpers();
const router = useRouter();
const userStore = useUserStore();

const { exportTable } = useExportTable();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const deleteDialog = ref(false);
const changeStatusDialog = ref(false);
const exportMenu = ref(null);
const status = ref('all');

onBeforeMount(async () => {
    await getItems();
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => goToEdit(),
            permission: 'administration.edit'
        },
        {
            label: isItemActive.value ? 'Make Inactive' : 'Make Active',
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog(),
            permission: 'administration.edit'
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            disabled: isItemActive.value,
            permission: 'administration.delete'
        }
    ].filter(Boolean);

    return helpers.filterByPermission(allMenuItems);
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status === 'active';
});

const exportMenuItems = [
    {
        icon: 'pi pi-file-excel',
        label: 'To Excel',
        command: () => exportData({ table: 'users', format: 'excel' })
    },
    {
        icon: 'pi pi-file-pdf',
        label: 'To PDF',
        command: () => exportData({ table: 'users', format: 'pdf' })
    }
];

const goToAddNew = () => {
    router.push({
        name: 'NewUser'
    });
};

const goToEdit = () => {
    router.push({
        name: 'EditUser',
        params: { id: selectedItem.value.id }
    });
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const showChangeStatusDialog = () => {
    changeStatusDialog.value = true;
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};

const onColReorder = (event) => {
    console.log(event);
};
const showExportMenu = (event) => {
    exportMenu.value.toggle(event);
};

const statusOptions = [
    { name: 'All', code: 'all' },
    { name: 'Active', code: 'active' },
    { name: 'Inactive', code: 'inactive' },
    { name: 'Pending', code: 'pending' }
];

const onStatusFilterChange = (value) => {
    // value here will be the `code` you selected
    if (value !== 'all') {
        sortFilters.updateFilters('status', value);
    } else {
        sortFilters.filters = [];
    }
    pagination.resetPageParams();
    getItems();
};

const exportData = async ({ table, format }) => {
    try {
        loading.value = true;
        const columns = [
            'name',
            'username',
            'supervisor_id',
            'primary_approver_id',
            'secondary_approver_id',
            'role_id',
            'email',
            'status'
        ];

        const lookups = {
            supervisor_id: 'users.name',
            primary_approver_id: 'users.name',
            secondary_approver_id: 'users.name',
            role_id: 'roles.name'
        };
        await exportTable({ table, format, columns, lookups });
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
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [
                { relation: 'role' },
                { relation: 'supervisor' },
                { relation: 'primaryApprover' },
                { relation: 'secondaryApprover' }
            ]
        };

        if (!payload.sort || payload.sort.length === 0) {
            payload.sort = [
                { field: 'status', direction: 'asc' },
                { field: 'name', direction: 'asc' }
            ];
        }
        const res = await userStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const deleteItem = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await userStore.deleteItem(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const changeStatus = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await userStore.changeStatus(selectedItem.value.id, {
                status:
                    selectedItem.value.status === 'active'
                        ? 'inactive'
                        : 'active'
            });
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">User Management</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    All users in the system.
                </p>
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
            <Button
                v-if="$ability.can('administration.create')"
                label="Add New"
                @click="goToAddNew"
            />
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
                class="users-table"
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
                        class="flex justify-end items-end flex-wrap gap-4 w-full"
                    >
                        <div class="flex flex-col w-full md:w-56">
                            <label
                                for="status"
                                class="mb-1 text-sm font-medium text-gray-700"
                            >
                                Filter by Status
                            </label>
                            <InputField
                                v-model="status"
                                id="status"
                                class="w-full"
                                placeholder="Select Status"
                                variant="dropdown"
                                optionLabel="name"
                                optionValue="code"
                                :options="statusOptions"
                                @update:modelValue="onStatusFilterChange"
                            />
                        </div>

                        <div class="flex flex-col w-full md:w-72">
                            <Search
                                id="search"
                                v-model="searchText"
                                @search="search"
                                class="w-full"
                            />
                        </div>
                    </div>
                </template>
                <template #empty> No users found. </template>
                <Column
                    :sortable="true"
                    field="name"
                    header="Full Name"
                    class="whitespace-nowrap"
                >
                    <template #body="{ data }">
                        <router-link
                            v-if="$ability.can('administration.edit')"
                            :to="{ name: 'EditUser', params: { id: data.id } }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.name }}
                        </router-link>
                        <span v-else>{{ data.name }}</span>
                    </template>
                </Column>
                <Column
                    :sortable="true"
                    field="username"
                    header="User Name"
                    class="whitespace-nowrap"
                />
                <Column
                    :sortable="false"
                    field="supervisor.name"
                    header="Supervisor"
                    class="whitespace-nowrap"
                />
                <Column
                    :sortable="false"
                    field="primaryApprover.name"
                    header="Primary Approver"
                    class="whitespace-nowrap"
                />
                <Column
                    :sortable="false"
                    field="secondaryApprover.name"
                    header="Secondary Approver"
                    class="whitespace-nowrap"
                />
                <Column
                    class="capitalize whitespace-nowrap"
                    :sortable="true"
                    field="role.name"
                    header="Role"
                />
                <Column
                    class="whitespace-nowrap"
                    :sortable="true"
                    field="email"
                    header="Email"
                />
                <Column header="Status" :sortable="true" field="status">
                    <template #body="{ data }">
                        <StatusTag :status="data.status" />
                    </template>
                </Column>
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

    <Confirmation
        v-if="$ability.can('administration.delete')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete User"
        content="Are you sure you want to delete this user?"
        @confirm="deleteItem"
    />

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this user ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />
</template>
