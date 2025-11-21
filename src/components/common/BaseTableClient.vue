<script setup>
import { ref, computed, useSlots, watch } from 'vue';

const slots = useSlots();
const slotNames = Object.keys(slots);

const props = defineProps({
    value: { type: Array, default: () => [] },
    dataKey: { type: String, default: 'id' },
    rowHover: { type: Boolean, default: true },
    stripedRows: { type: Boolean, default: true },
    paginator: { type: Boolean, default: true },
    rows: { type: Number, default: 10 },
    rowsPerPageOptions: { type: Array, default: () => [10, 40, 60, 80, 100] }
});

const localPage = ref(0);
const localRows = ref(props.rows);
const sortField = ref(null);
const sortOrder = ref(null);

const sortedData = computed(() => {
    if (!sortField.value) return props.value;
    return [...props.value].sort((a, b) => {
        const valA = a[sortField.value];
        const valB = b[sortField.value];
        if (valA === valB) return 0;
        if (sortOrder.value === 1) return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
    });
});

const paginatedData = computed(() => {
    const start = localPage.value * localRows.value;
    const end = start + localRows.value;
    return sortedData.value.slice(start, end);
});

const totalRecords = computed(() => props.value.length);

const pageTemplate = computed(() => {
    if (!props.value.length) return '';
    const from = localPage.value * localRows.value + 1;
    const to = Math.min(
        (localPage.value + 1) * localRows.value,
        totalRecords.value
    );
    return `Showing ${from} to ${to} of ${totalRecords.value} entries`;
});

const onPageChange = (e) => {
    localPage.value = e.page;
    localRows.value = e.rows;
};

const onSort = (e) => {
    sortField.value = e.sortField;
    sortOrder.value = e.sortOrder;
};

watch(
    () => props.value,
    () => {
        localPage.value = 0;
    }
);

defineExpose({ paginatedData });
</script>

<template>
    <DataTable
        v-bind="$attrs"
        :value="props.value"
        :data-key="dataKey"
        :row-hover="rowHover"
        :striped-rows="stripedRows"
        :paginator="paginator"
        :rows="localRows"
        :rows-per-page-options="rowsPerPageOptions"
        removableSort
        sortMode="single"
        :current-page-report-template="pageTemplate"
        paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        :scrollable="true"
        breakpoint="960px"
        @page="onPageChange"
    >
        <template
            v-for="(name, index) in slotNames"
            :key="index"
            #[name]="slotProps"
        >
            <slot :name="name" v-bind="slotProps || {}" />
        </template>
    </DataTable>
</template>
