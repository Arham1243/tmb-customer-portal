<script setup>
import { ref, computed, watch } from 'vue';
import { useHelpers } from '@/composables/useHelpers';
import { useUserRole } from '@/composables/useUserRole';

const props = defineProps({
    additionalItems: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['refresh', 'item-changed']);

const { moneyFormat, formatMultiline } = useHelpers();
const { isAdmin, isApprover } = useUserRole();

const tableRef = ref();
const editingRows = ref([]);

// Track original values for change detection
const originalValues = ref(new Map());

const canEdit = computed(() => isAdmin.value || isApprover.value);

const currentPageItems = computed(() => tableRef.value?.paginatedData || []);

// Calculate totals based on currently visible page data
const totals = computed(() => {
    const billableAmount = currentPageItems.value.reduce(
        (sum, item) => sum + (parseFloat(item.billable_amount) || 0),
        0
    );
    return {
        billableAmount
    };
});

// Store original values when component mounts
watch(
    () => props.additionalItems,
    (newItems) => {
        if (newItems) {
            newItems.forEach((item) => {
                if (!originalValues.value.has(item.id)) {
                    originalValues.value.set(item.id, {
                        billable_amount: item.billable_amount,
                        description: item.description
                    });
                }
            });
        }
    },
    { immediate: true }
);

const onCellEditComplete = (event) => {
    const { data, newValue, field } = event;
    data[field] = newValue;

    // Check if value changed from original
    const original = originalValues.value.get(data.id);
    if (original) {
        const hasChanges =
            original.billable_amount !== data.billable_amount ||
            original.description !== data.description;

        if (hasChanges) {
            emit('item-changed', {
                id: data.id,
                type: 'additional_item',
                data
            });
        }
    }
};
</script>

<template>
    <div>
        <BaseTableClient
            ref="tableRef"
            :value="additionalItems"
            :paginator="false"
            editMode="cell"
            @cell-edit-complete="onCellEditComplete"
            v-model:editingRows="editingRows"
            dataKey="id"
        >
            <Column field="label" header="Additional Items" />
            <Column field="amount" header="Amount" class="amount-column">
                <template #body="{ data }">
                    {{ moneyFormat(data.amount) }}
                </template>
            </Column>
            <Column class="amount-column" field="billable_amount">
                <template #header>
                    <span class="font-semibold">Billable<br />Amount</span>
                </template>
                <template #body="{ data }">
                    {{ moneyFormat(data.billable_amount) }}
                </template>
                <template #editor="{ data, field }">
                    <InputField
                        v-model="data[field]"
                        variant="number"
                        prefix="$"
                        :disabled="!canEdit"
                        class="w-full"
                        :maxFractionDigits="2"
                        :minFractionDigits="2"
                    />
                </template>
                <template #footer>
                    <span class="font-semibold text-lg">
                        {{ moneyFormat(totals.billableAmount) }}</span
                    >
                </template>
            </Column>
            <Column field="description" header="Description (Invoicing Notes)">
                <template #body="{ data }">
                    <span v-html="formatMultiline(data.description)"></span>
                </template>
                <template #editor="{ data, field }">
                    <InputField
                        v-model="data[field]"
                        variant="textarea"
                        :disabled="!canEdit"
                        class="w-full"
                        rows="10"
                        :class="
                            data[field]?.length >= 1000 ? '!border-red-500' : ''
                        "
                        @keydown.enter.stop
                        maxlength="1000"
                    />
                </template>
            </Column>
            <template #empty> No additional items found. </template>
        </BaseTableClient>
    </div>
</template>
