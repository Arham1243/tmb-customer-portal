<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useInvoiceTemplateStore } from '@/modules/administration/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useRouter } from 'vue-router';

const { filterByPermission } = useHelpers();

const invoiceTemplateStore = useInvoiceTemplateStore();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const router = useRouter();
const searchText = ref('');
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const defaultDialog = ref(false);

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
        !isItemDefault.value && {
            label: 'Set as Default',
            icon: 'pi pi-star',
            command: () => showDefaultDialog(),
            disabled: !isItemActive.value,
            permission: 'administration.edit'
        }
    ].filter(Boolean);

    return filterByPermission(allMenuItems);
});

const isItemDefault = computed(() => {
    return selectedItem.value && selectedItem.value.is_default;
});

const goToEdit = () => {
    if (!selectedItem.value?.id) return;
    router.push({
        name: 'EditInvoiceTemplate',
        params: { id: selectedItem.value.id }
    });
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
        const res = await invoiceTemplateStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const makeDefault = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await invoiceTemplateStore.makeDefault(selectedItem.value.id);
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
                <h1 class="text-2xl sm:text-3xl font-bold">
                    Invoice Templates
                </h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These invoice templates are used for invoicing.
                </p>
            </div>
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
                <template #empty> No invoice templates found. </template>
                <Column :sortable="true" field="name" header="Name">
                    <template #body="{ data }">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4 flex-wrap">
                                <router-link
                                    :to="{
                                        name: 'EditInvoiceTemplate',
                                        params: { id: data.id }
                                    }"
                                    class="text-blue-600 hover:text-blue-800 cursor-pointer"
                                >
                                    {{ data.name }}
                                </router-link>
                                <Tag
                                    severity="info"
                                    v-if="data.is_default"
                                    value="Default"
                                />
                            </div>
                        </div>
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

    <Confirmation
        v-if="$ability.can('administration.edit')"
        v-model="defaultDialog"
        variant="success"
        :header="`Set ${selectedItem?.name} as Default`"
        :content="`Are you sure you want to make this invoice template default?`"
        @confirm="makeDefault"
    />
</template>
