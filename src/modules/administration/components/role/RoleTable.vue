<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue';
import { useRoleStore } from '@/modules/administration/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useRouter } from 'vue-router';

const globalStore = useGlobalStore();
const router = useRouter();
const roleStore = useRoleStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const showDialog = ref(false);
const isEditMode = ref(false);
const deleteDialog = ref(false);
const busy = ref(false);
const totalRecords = ref();
const selectedRole = ref('');
const formData = ref({
    name: '',
    is_admin: false,
    is_approver: false,
    status: true
});

onBeforeMount(async () => {
    await getItems();
});

watch(selectedRole, (newVal) => {
    formData.value.is_admin = newVal === 'is_admin';
    formData.value.is_approver = newVal === 'is_approver';
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    return [
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => editItem(),
            permission: 'administration.edit'
        },
        {
            label: 'Manage Permissions',
            icon: 'pi pi-cog',
            command: () =>
                router.push({
                    name: 'RolePermissions',
                    params: { id: selectedItem.value.id }
                })
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            disabled: isItemSystem.value,
            permission: 'administration.delete'
        }
    ];
});

const isItemSystem = computed(() => selectedItem.value?.system);

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    resetForm();
};

const resetForm = () => {
    formData.value.name = '';
    formData.value.is_admin = false;
    formData.value.is_approver = false;
    formData.value.status = true;
    selectedRole.value = 'normal';
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    formData.value.name = selectedItem.value.name;
    formData.value.status = selectedItem.value.status;
    if (selectedItem.value.is_admin) {
        formData.value.is_admin = true;
        selectedRole.value = 'is_admin';
    } else if (selectedItem.value.is_approver) {
        formData.value.is_approver = true;
        selectedRole.value = 'is_approver';
    } else {
        formData.value.is_admin = false;
        formData.value.is_approver = false;
        selectedRole.value = 'normal';
    }
    openDialog('edit');
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
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
        const payload = sortFilters.getSortFilters(searchText.value);
        const res = await roleStore.search(payload, params);
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
            await roleStore.deleteItem(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const save = async () => {
    try {
        const payload = {
            name: formData.value.name,
            is_admin: selectedRole.value === 'is_admin',
            is_approver: selectedRole.value === 'is_approver',
            status: formData.value.status
        };
        busy.value = true;
        if (isEditMode.value) {
            await roleStore.update(selectedItem.value.id, payload);
        } else {
            await roleStore.create(payload);
        }
        closeDialog();
        await getItems();
        selectedItem.value = {};
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">User Roles</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These user roles are used for managing user permissions.
                </p>
            </div>
        </template>
        <template #actions>
            <Button
                v-if="$ability.can('administration.create')"
                label="Add New"
                @click="openDialog('add')"
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
                <template #empty> No roles found. </template>
                <Column
                    class="w-[30rem]"
                    :sortable="true"
                    field="name"
                    header="Role Name"
                >
                    <template #body="{ data }">
                        <span class="capitalize">
                            {{ data.name }}
                        </span>
                    </template>
                </Column>
                <Column field="is_admin" header="Is Admin">
                    <template #body="{ data }">
                        <StatusTag
                            v-if="data.is_admin"
                            :value="data.is_admin ? 'Yes' : 'No'"
                            :severity="data.is_admin ? 'success' : 'danger'"
                        />
                    </template>
                </Column>

                <Column field="is_approver" header="Is Approver">
                    <template #body="{ data }">
                        <StatusTag
                            v-if="data.is_approver"
                            :value="data.is_approver ? 'Yes' : 'No'"
                            :severity="data.is_approver ? 'success' : 'danger'"
                        />
                    </template>
                </Column>

                <Column field="system" class="text-right">
                    <template #body="{ data }">
                        <i
                            v-if="data.system"
                            class="pi pi-lock text-red-500 !text-xl opacity-90"
                        ></i>
                    </template>
                </Column>

                <Column
                    v-if="$ability.can('administration.edit')"
                    header="Actions"
                    class="flex justify-end"
                >
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

    <BaseDialog
        v-if="
            $ability.can('administration.edit') ||
            $ability.can('administration.create')
        "
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? 'Edit Role' : 'New Role'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name">Role Name</label>
            <InputField
                variant="text"
                id="name"
                v-model="formData.name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>
        <div class="mb-2 col-span-12 flex flex-col gap-2">
            <div class="flex items-center gap-2 mb-2">
                <InputField
                    id="is_admin"
                    inputId="is_admin"
                    name="role"
                    variant="radio"
                    v-model="selectedRole"
                    :value="'is_admin'"
                    :disabled="busy"
                />
                <label for="is_admin" class="cursor-pointer">Admin Role</label>
            </div>

            <div class="flex items-center gap-2 mb-2">
                <InputField
                    id="is_approver"
                    inputId="is_approver"
                    name="role"
                    variant="radio"
                    v-model="selectedRole"
                    :value="'is_approver'"
                    :disabled="busy"
                />
                <label for="is_approver" class="cursor-pointer"
                    >Approver Role</label
                >
            </div>

            <div class="flex items-center gap-2 mb-2">
                <InputField
                    id="normal"
                    inputId="normal"
                    name="role"
                    variant="radio"
                    v-model="selectedRole"
                    :value="'normal'"
                    :disabled="busy"
                />
                <label for="normal" class="cursor-pointer">Normal Role</label>
            </div>
        </div>
    </BaseDialog>

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Role"
        content="Are you sure you want to delete this role?"
        @confirm="deleteItem"
    />
</template>
