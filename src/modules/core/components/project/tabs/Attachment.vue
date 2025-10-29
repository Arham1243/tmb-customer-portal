<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useProjectAttachmentStore } from '@/modules/core/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useRoute } from 'vue-router';

const route = useRoute();
const projectAttachmentStore = useProjectAttachmentStore();
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
const formData = ref({
    file_name: null,
    description: null,
    file_path: null
});

onBeforeMount(async () => {
    await getItems();
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: 'Download',
            icon: 'pi pi-download',
            command: () => downloadFile()
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => showDeleteDialog()
        }
    ];

    return allMenuItems;
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
    formData.value.file_name = null;
    formData.value.description = null;
    formData.value.file_path = null;
    globalStore.clearErrors();
};

const downloadFile = () => {
    if (selectedItem.value.file_path) {
        window.open(selectedItem.value.file_path, '_blank');
    }
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};

function onFileSelect(event) {
    const file = event.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.file_path = e.target.result;
        formData.value.file_name = file.name;
    };
    reader.readAsDataURL(file);
}

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
            filters: [
                {
                    field: 'project_id',
                    operator: '=',
                    value: route.params.id
                }
            ]
        };
        const res = await projectAttachmentStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const save = async () => {
    try {
        const modifiedFormData = {
            ...formData.value,
            project_id: route.params.id
        };
        busy.value = true;
        await projectAttachmentStore.create(modifiedFormData);
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
            await projectAttachmentStore.deleteItem(selectedItem.value.id);
        }
        await getItems();
        selectedItem.value = {};
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
                    <Button label="Add Attachment" @click="openDialog('add')" />
                </div>
            </div>
        </template>
        <template #empty> No attachments found. </template>

        <Column
            class="w-[30rem]"
            :sortable="true"
            field="description"
            header="Short Description"
        />

        <Column :sortable="true" field="file_name" header="File Name">
            <template #body="{ data }">
                <a
                    :href="data.file_path"
                    target="_blank"
                    class="text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                    {{ data.file_name }}
                </a>
            </template>
        </Column>

        <Column header="Actions" class="flex justify-end gap-3">
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

    <BaseDialog
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        header="Upload Attachment"
        confirmLabel="Save"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block mb-3 required" for="description"
                >Short Description</label
            >
            <InputField
                variant="text"
                id="description"
                v-model="formData.description"
                class="w-full"
                :disabled="busy"
            />
        </div>
        <div class="col-span-12">
            <label class="block mb-3 required">Upload File</label>
            <div class="mb-5 p-inputtext w-full flex gap-4 items-center">
                <FileUpload
                    name="customerProposal"
                    mode="basic"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    :disabled="busy"
                    :auto="true"
                    customUpload
                    @uploader="onFileSelect"
                />
                {{ formData.file_name ?? 'No file chosen' }}
            </div>
        </div>
    </BaseDialog>

    <Confirmation
        v-model="deleteDialog"
        variant="danger"
        header="Delete Attachment"
        content="Are you sure you want to delete this attachment?"
        @confirm="deleteItem"
    />
</template>
