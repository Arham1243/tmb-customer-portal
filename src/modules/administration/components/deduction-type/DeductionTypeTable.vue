<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import {
    useDeductionTypeStore,
    useExpenseCategoryStore
} from '@/modules/administration/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { truncate } from 'lodash-es';
import { useHelpers } from '@/composables';

const { filterByPermission, filterActiveWithSelected } = useHelpers();

const deductionTypeStore = useDeductionTypeStore();
const expenseCategoryStore = useExpenseCategoryStore();
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
const expenseCategories = ref([]);
const loadingExpenseCategories = ref(false);
const formData = ref({
    name: '',
    expense_category_id: '',
    system_link: 'NC',
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
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            disabled: isItemActive.value,
            permission: 'administration.delete'
        }
    ];

    return filterByPermission(allMenuItems);
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status;
});

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
    getExpenseCategories();
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
    formData.value.expense_category_id = '';
    formData.value.system_link = 'NC';
    formData.value.status = true;
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    formData.value.name = selectedItem.value.name;
    formData.value.expense_category_id = selectedItem.value.expense_category_id;
    formData.value.system_link = selectedItem.value.system_link;
    formData.value.status = selectedItem.value.status;
    openDialog('edit');
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

const getExpenseCategories = async (searchText = '') => {
    try {
        loadingExpenseCategories.value = true;
        const params = {
            limit: 300
        };
        const payload = {
            search: {
                value: searchText
            }
        };
        const res = await expenseCategoryStore.search(payload, params);
        expenseCategories.value = filterActiveWithSelected(
            res.data,
            formData.value.expense_category_id
        );
    } finally {
        loadingExpenseCategories.value = false;
    }
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = {
            ...sortFilters.getSortFilters(searchText.value),
            includes: [{ relation: 'expenseCategory' }]
        };
        const res = await deductionTypeStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const save = async () => {
    try {
        busy.value = true;
        if (isEditMode.value) {
            await deductionTypeStore.update(
                selectedItem.value.id,
                formData.value
            );
        } else {
            await deductionTypeStore.create(formData.value);
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
            await deductionTypeStore.deleteItem(selectedItem.value.id);
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
            await deductionTypeStore.changeStatus(selectedItem.value.id);
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
                <h1 class="text-2xl sm:text-3xl font-bold">Deduction Types</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These types define deductions applied when invoices aren’t
                    fully paid but must still be settled.
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
                <template #empty> No deduction types found. </template>
                <Column
                    class="w-[30rem]"
                    :sortable="true"
                    field="name"
                    header="Name"
                >
                    <template #body="{ data }">
                        <div class="flex items-center justify-between">
                            <span
                                v-tooltip.top="
                                    data.name?.length > 30
                                        ? data.name
                                        : undefined
                                "
                            >
                                {{ truncate(data.name, { length: 30 }) }}
                            </span>

                            <i
                                v-tooltip.top="data.system_link"
                                v-if="data.system_link !== 'NC'"
                                class="pi pi-link ml-2 cursor-pointer text-blue-500"
                            ></i>
                        </div>
                    </template>
                </Column>

                <Column
                    :sortable="true"
                    field="expenseCategory.name"
                    header="Expense Category"
                />

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
        :header="isEditMode ? 'Edit Deduction Type' : 'New Deduction Type'"
        :confirmLabel="isEditMode ? 'Update' : 'Save'"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name">Name</label>
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
            <label class="block required mb-2" for="expense_category_id"
                >Expense Category</label
            >
            <ApiDropdown
                showClear
                filter
                placeholder="Select"
                :loading="loadingExpenseCategories"
                @search="getExpenseCategories"
                :options="expenseCategories"
                optionLabel="display_name"
                optionValue="id"
                id="expense_category_id"
                v-model="formData.expense_category_id"
                class="w-full"
                :disabled="busy || loadingExpenseCategories"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-2" for="system_link">System Link</label>
            <InputField
                variant="text"
                id="system_link"
                v-model="formData.system_link"
                class="w-full"
                @keyup.enter="save"
                :disabled="true"
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
        v-if="$ability.can('administration.delete')"
        v-model="deleteDialog"
        variant="danger"
        header="Delete Deduction Type"
        content="Are you sure you want to delete this deduction type?"
        @confirm="deleteItem"
    />

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? 'Make Inactive' : 'Make Active'"
        :content="`Are you sure you want to make this deduction type ${isItemActive ? 'inactive' : 'active'}?`"
        :confirmButtonText="isItemActive ? 'Make Inactive' : 'Make Active'"
        @confirm="changeStatus"
    />
</template>
