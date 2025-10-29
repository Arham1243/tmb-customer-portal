<script setup>
import { ref, computed, watch } from 'vue';
import { useHelpers } from '@/composables/useHelpers';
import { useUserRole } from '@/composables/useUserRole';

const props = defineProps({
    expenses: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['refresh', 'item-changed']);
const { isAdmin, isApprover } = useUserRole();

const { formatDate, moneyFormat, formatMultiline } = useHelpers();

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
    () => props.expenses,
    (newExpenses) => {
        if (newExpenses) {
            newExpenses.forEach((expense) => {
                if (!originalValues.value.has(expense.id)) {
                    originalValues.value.set(expense.id, {
                        billable_amount: expense.billable_amount,
                        description: expense.description
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
            emit('item-changed', { id: data.id, type: 'expense', data });
        }
    }
};
</script>

<template>
    <div>
        <BaseTableClient
            ref="tableRef"
            :value="expenses"
            :paginator="false"
            editMode="cell"
            @cell-edit-complete="onCellEditComplete"
            v-model:editingRows="editingRows"
            dataKey="id"
        >
            <Column field="user.name" header="User" />
            <Column field="date" header="Date">
                <template #body="{ data }">
                    {{ formatDate(data.date) }}
                </template>
            </Column>
            <Column field="expenseCategory.name" header="Expense Category">
                <template #header>
                    <span class="font-semibold">Expense<br />Category</span>
                </template>
            </Column>
            <Column field="is_billable">
                <template #header>
                    <span class="font-semibold">Non<br />Billable</span>
                </template>
                <template #body="{ data }">
                    <StatusTag v-if="!data.is_billable" status="Yes" />
                </template>
            </Column>
            <Column field="is_reimbursable">
                <template #header>
                    <span class="font-semibold">Non<br />Reimbursable</span>
                </template>
                <template #body="{ data }">
                    <StatusTag v-if="!data.is_reimbursable" status="Yes" />
                </template>
            </Column>
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
                        :disabled="!data.is_billable || !canEdit"
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

            <Column field="creditCard.name" header="Card used" />
            <Column field="attachment" header="Attachment">
                <template #body="{ data }">
                    <Button
                        v-if="data.attachment"
                        as="a"
                        :href="data.attachment"
                        target="_blank"
                        rounded
                        variant="outlined"
                        icon="pi pi-eye"
                        size="small"
                        class="mx-auto !flex"
                    />
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
            <template #empty> No expenses found. </template>
        </BaseTableClient>
    </div>
</template>
