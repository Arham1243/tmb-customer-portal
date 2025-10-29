<script setup>
import { ref, computed, watch } from 'vue';
import { useHelpers } from '@/composables/useHelpers';
import { useUserRole } from '@/composables/useUserRole';

const props = defineProps({
    timesheets: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['refresh', 'item-changed']);

const { isAdmin, isApprover } = useUserRole();
const { formatDate, moneyFormat, formatHours, formatMultiline } = useHelpers();

const tableRef = ref();
const editingRows = ref([]);

// Track original values for change detection
const originalValues = ref(new Map());

const canEdit = computed(() => isAdmin.value || isApprover.value);

const currentPageItems = computed(() => tableRef.value?.paginatedData || []);

// Calculate totals based on currently visible page data
const totals = computed(() => {
    const billableHours = currentPageItems.value.reduce(
        (sum, item) => sum + (parseFloat(item.billable_hours) || 0),
        0
    );
    const chargeAmount = currentPageItems.value.reduce(
        (sum, item) => sum + (parseFloat(item.charge_amount) || 0),
        0
    );
    return {
        billableHours,
        chargeAmount
    };
});

// Store original values when component mounts
watch(
    () => props.timesheets,
    (newTimesheets) => {
        if (newTimesheets) {
            newTimesheets.forEach((timesheet) => {
                if (!originalValues.value.has(timesheet.id)) {
                    originalValues.value.set(timesheet.id, {
                        billable_hours: timesheet.billable_hours,
                        charge_rate: timesheet.charge_rate,
                        charge_amount: timesheet.charge_amount,
                        description: timesheet.description
                    });
                }
            });
        }
    },
    { immediate: true }
);

const onCellEditComplete = (event) => {
    const { data, newValue, field } = event;

    if (field === 'billable_hours' || field === 'charge_rate') {
        // Recalculate charge_amount
        const billableHours =
            field === 'billable_hours' ? newValue : data.billable_hours;
        const chargeRate =
            field === 'charge_rate' ? newValue : data.charge_rate;
        data.charge_amount = (billableHours || 0) * (chargeRate || 0);
    }

    data[field] = newValue;

    // Check if value changed from original
    const original = originalValues.value.get(data.id);
    if (original) {
        const hasChanges =
            original.billable_hours !== data.billable_hours ||
            original.charge_rate !== data.charge_rate ||
            original.description !== data.description;

        if (hasChanges) {
            emit('item-changed', { id: data.id, type: 'timesheet', data });
        }
    }
};
</script>

<template>
    <div>
        <BaseTableClient
            ref="tableRef"
            :value="timesheets"
            :paginator="false"
            editMode="cell"
            @cell-edit-complete="onCellEditComplete"
            v-model:editingRows="editingRows"
            dataKey="id"
        >
            <Column field="user.name" header="User Name" />
            <Column field="date" header="Date">
                <template #body="{ data }">
                    {{ formatDate(data.date) }}
                </template>
            </Column>
            <Column field="projectTask.name" header="Task" />
            <Column field="input_hours">
                <template #header>
                    <span class="font-semibold">Input<br />Hours</span>
                </template>
                <template #body="{ data }">
                    {{ formatHours(data.input_hours) }}
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
            <Column field="is_reportable">
                <template #header>
                    <span class="font-semibold">Non<br />Reportable</span>
                </template>
                <template #body="{ data }">
                    <StatusTag v-if="!data.is_reportable" status="Yes" />
                </template>
            </Column>
            <Column field="billable_hours">
                <template #header>
                    <span class="font-semibold">Billable<br />Hours</span>
                </template>
                <template #body="{ data }">
                    {{ formatHours(data.billable_hours) }}
                </template>
                <template #editor="{ data, field }">
                    <InputField
                        v-model="data[field]"
                        variant="number"
                        :disabled="!data.is_billable || !canEdit"
                        class="w-full"
                        :maxFractionDigits="2"
                        :minFractionDigits="2"
                    />
                </template>
                <template #footer>
                    <span class="font-semibold text-lg">
                        {{ formatHours(totals.billableHours) }}</span
                    >
                </template>
            </Column>
            <Column class="amount-column" field="billing_rate">
                <template #header>
                    <span class="font-semibold">Billing<br />Rate</span>
                </template>
                <template #body="{ data }">
                    {{ moneyFormat(data.billing_rate) }}
                </template>
            </Column>
            <Column class="amount-column" field="charge_rate">
                <template #header>
                    <span class="font-semibold">Charge<br />Rate</span>
                </template>
                <template #body="{ data }">
                    {{ moneyFormat(data.charge_rate) }}
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
            </Column>
            <Column class="amount-column" field="charge_amount">
                <template #header>
                    <span class="font-semibold">Charge<br />Amount</span>
                </template>
                <template #body="{ data }">
                    {{ moneyFormat(data.charge_amount) }}
                </template>
                <template #footer>
                    <span class="font-semibold text-lg">
                        {{ moneyFormat(totals.chargeAmount) }}</span
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
            <template #empty> No timesheets found. </template>
        </BaseTableClient>
    </div>
</template>
