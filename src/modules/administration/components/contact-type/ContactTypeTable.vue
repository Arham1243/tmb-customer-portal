<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useContactTypeStore } from '@/modules/administration/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { truncate } from 'lodash-es';
import { useHelpers } from '@/composables';

const helpers = useHelpers();

const contactTypeStore = useContactTypeStore();
const globalStore = useGlobalStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const searchText = ref('');
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const isEditMode = ref(false);
const busy = ref(false);
const totalRecords = ref();
const showDialog = ref(false);
const deleteDialog = ref(false);
const changeStatusDialog = ref(false);
const defaultDialog = ref(false);
const formData = ref({
    name: '',
    display_name: '',
    is_default: false,
    status: true
});

onBeforeMount(async () => {
    await getItems();
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => editItem(),
            permission: 'administration.edit'
        },
        {
            label: isItemActive.value ? 'Make Inactive' : 'Make Active',
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog(),
            permission: 'administration.edit'
        },
        isItemActive.value &&
            !isItemDefault.value && {
                label: 'Set as Default',
                icon: 'pi pi-star',
                command: () => showDefaultDialog(),
                permission: 'administration.edit'
            },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            permission: 'administration.delete'
        }
    ].filter(Boolean);

    return helpers.filterByPermission(allMenuItems);
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status;
});

const isItemDefault = computed(() => {
    return selectedItem.value && selectedItem.value.is_default;
});

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
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
    formData.value.display_name = '';
    formData.value.status = true;
    formData.value.is_default = false;
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    formData.value.name = selectedItem.value.name;
    formData.value.display_name = selectedItem.value.display_name;
    formData.value.is_default = selectedItem.value.is_default;
    formData.value.status = selectedItem.value.status;
    openDialog('edit');
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const showChangeStatusDialog = () => {
    changeStatusDialog.value = true;
};

const showDefaultDialog = () => {
    defaultDialog.value = true;
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
        const res = await contactTypeStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const save = async () => {
    try {
        if (items.value.length === 0) {
            formData.value.is_default = true;
        }
        busy.value = true;
        if (isEditMode.value) {
            await contactTypeStore.update(
                selectedItem.value.id,
                formData.value
            );
        } else {
            await contactTypeStore.create(formData.value);
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

const deleteItem = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await contactTypeStore.deleteItem(selectedItem.value.id);
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
            await contactTypeStore.changeStatus(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const makeDefault = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await contactTypeStore.makeDefault(selectedItem.value.id);
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
                <h1 class="text-2xl sm:text-3xl font-bold">Contact Types</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These types will be used in identifying contacts for
                    customers.
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
                <template #empty> No contact types found. </template>
                <Column
                    class="w-[30rem]"
                    :sortable="true"
                    field="name"
                    header="Contact Type Name"
                >
                    <template #body="{ data }">
                        <div class="flex items-center gap-4 flex-wrap">
                            <span
                                v-tooltip.top="
                                    data.name?.length > 30
                                        ? data.name
                                        : undefined
                                "
                            >
                                {{ truncate(data.name, { length: 30 }) }}
                            </span>
                            <Tag
                                severity="info"
                                v-if="data.is_default"
                                value="Default"
                            />
                        </div>
                    </template>
                </Column>

                <Column
                    class="w-[25rem]"
                    :sortable="true"
                    field="display_name"
                    header="Contact Type List Name"
                >
                    <template #body="{ data }">
                        <span
                            v-tooltip.top="
                                data.display_name?.length > 30
                                    ? data.display_name
                                    : undefined
                            "
                        >
                            {{ truncate(data.display_name, { length: 30 }) }}
                        </span>
                    </template>
                </Column>

                <Column header="Status" :sortable="true" field="status">
                    <template #body="{ data }">
                        <StatusTag
                            :status="data.status ? 'active' : 'inactive'"
                        />
                    </template>
                </Column>

                <Column
                    v-if="
                        $ability.can('administration.edit') ||
                        $ability.can('administration.delete')
                    "
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
        :header="isEditMode ? 'Edit Contact Type' : 'New Contact Type'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name"
                >Contact Type Name</label
            >
            <InputField
                variant="text"
                id="name"
                v-model="formData.name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="display_name"
                >Contact Type List Name</label
            >
            <InputField
                variant="text"
                id="display_name"
                v-model="formData.display_name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3">Status</label>
            <div class="flex items-center gap-3">
                <InputField
                    inputId="status"
                    variant="switch"
                    v-model="formData.status"
                    :disabled="busy"
                />
                <label class="cursor-pointer mt-1" for="status">{{
                    formData.status ? 'Active' : 'Inactive'
                }}</label>
            </div>
        </div>
    </BaseDialog>

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Contact Type"
        content="Are you sure you want to delete this contact type?"
        @confirm="deleteItem"
    />

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this contact type ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="defaultDialog"
        variant="success"
        :header="`Set ${selectedItem?.name} as Default`"
        :content="`Are you sure you want to make this contact type default?`"
        @confirm="makeDefault"
    />
</template>
