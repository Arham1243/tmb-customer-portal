<script setup>
import { computed } from 'vue';
import { useHelpers } from '@/composables/useHelpers';

const { moneyFormat, formatHours } = useHelpers();

const props = defineProps({
    summary: {
        type: Object,
        required: true
    },
    allowedCredit: {
        type: Number,
        default: 0
    },
    advancePayment: {
        type: Number,
        default: 0
    },
});

const emit = defineEmits(['update:advancePayment']);

// Computed: Remaining credit after applying credits
const remainingCredit = computed(() => {
    return props.allowedCredit - props.advancePayment;
});

// Computed: Net Invoice Amount (uses outstanding_balance from backend, then subtracts applied credits)
const netInvoiceAmount = computed(() => {
    return (props.summary?.outstanding_balance || 0) - props.advancePayment;
});

// Computed: Maximum allowed credit (lesser of allowedCredit or outstanding_balance)
const maxAllowedCredit = computed(() => {
    const outstandingBalance = props.summary?.outstanding_balance || 0;
    return Math.min(props.allowedCredit, outstandingBalance);
});

// Handle input changes for instant updates
const handleInput = (event) => {
    const value = event.value || 0;
    const maxValue = Math.min(value, maxAllowedCredit.value);
    emit('update:advancePayment', maxValue);
};

// Two-way binding for advance payment input
const localAdvancePayment = computed({
    get() {
        return props.advancePayment;
    },
    set(value) {
        const maxValue = Math.min(value || 0, maxAllowedCredit.value);
        emit('update:advancePayment', maxValue);
    }
});
</script>
<template>
    <Card class="sticky top-6">
        <template #content>
            <h2 class="text-xl font-semibold text-gray-900">Summary</h2>
            <div class="mt-3 space-y-2">
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Billable Hours</span>
                    <span class="font-semibold text-gray-900"
                        >{{ formatHours(props.summary?.billable_hours) }}
                    </span>
                </div>
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Charge Amount</span>
                    <span class="font-semibold text-gray-900">{{
                        moneyFormat(props.summary?.charge_amount)
                    }}</span>
                </div>
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Billable Expenses</span>
                    <span class="font-semibold text-gray-900">{{
                        moneyFormat(props.summary?.billable_expenses)
                    }}</span>
                </div>
                <div class="flex justify-between items-center py-2">
                    <span class="text-gray-600">Additional Items</span>
                    <span class="font-semibold text-gray-900">{{
                        moneyFormat(props.summary?.additional_items_total)
                    }}</span>
                </div>
                <div
                    class="flex justify-between items-center pt-3 mt-3 border-t border-gray-200"
                >
                    <span class="text-lg font-semibold text-gray-900"
                        >Total Invoice Amount</span
                    >
                    <span class="text-lg font-bold text-gray-900">{{
                        moneyFormat(props.summary?.total_billable)
                    }}</span>
                </div>
                <div class="py-2 mt-2">
                    <label class="block text-gray-600 mb-2 font-medium"
                        >Advance Payments / Credits</label
                    >
                    <InputNumber
                        v-model="localAdvancePayment"
                        @input="handleInput"
                        :min="0"
                        :step="1"
                        :max="maxAllowedCredit"
                        :maxFractionDigits="2"
                        :minFractionDigits="2"
                        prefix="$"
                        :disabled="maxAllowedCredit <= 0"
                        class="w-full"
                    />
                    <small class="block text-gray-500 mt-1">
                        Remaining credit:
                        <span
                            :class="{
                                'text-red-500 font-semibold': remainingCredit < 0
                            }"
                        >
                            {{ moneyFormat(remainingCredit) }}
                        </span>
                    </small>
                </div>
                <div
                    class="flex justify-between items-center pt-3 mt-2 border-t-2 border-gray-300"
                >
                    <span class="text-xl font-semibold text-gray-900"
                        >Net Invoice Amount</span
                    >
                    <span class="text-xl font-bold text-green-600">{{
                        moneyFormat(netInvoiceAmount)
                    }}</span>
                </div>
            </div>
        </template>
    </Card>
</template>
