<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useEmailTemplateStore } from '@/modules/administration/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useRouter } from 'vue-router';

const { makeSlugToTitleCase, filterByPermission } = useHelpers();

const emailTemplateStore = useEmailTemplateStore();
const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const router = useRouter();
const searchText = ref('');
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();

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
        }
    ];

    return filterByPermission(allMenuItems);
});

const goToEdit = () => {
    if (!selectedItem.value?.id) return;
    router.push({
        name: 'EditEmailTemplate',
        params: { id: selectedItem.value.id }
    });
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
        const res = await emailTemplateStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold">Email Templates</h1>
                <p class="mt-2 text-sm sm:text-base mx-auto sm:mx-0 mb-0">
                    These email templates are used across the system.
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
                <template #empty> No email templates found. </template>
                <Column
                    class="w-[30rem]"
                    :sortable="true"
                    field="name"
                    header="Email Template Name"
                >
                    <template #body="{ data }">
                        <router-link
                            :to="{
                                name: 'EditEmailTemplate',
                                params: { id: data.id }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ makeSlugToTitleCase(data.name) }}
                        </router-link>
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
</template>
