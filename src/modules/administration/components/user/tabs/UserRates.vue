<script setup>
import { toRefs, computed, watch } from 'vue';

const props = defineProps({
    formData: { type: Object, required: true },
    isEditMode: { type: Boolean, required: true, default: false },
    busy: { type: Boolean, required: true, default: false }
});

const emit = defineEmits(['save']);
const { formData, busy } = toRefs(props);

const effectiveCost = computed(() => {
    if (
        !formData.value.base_cost_per_hour ||
        !formData.value.average_overhead_factor
    )
        return 0;
    return (
        formData.value.base_cost_per_hour *
        (1 + formData.value.average_overhead_factor / 100)
    ).toFixed(2);
});

const marginRate = computed(() => {
    if (
        !formData.value.default_user_billing_rate_per_hour ||
        !effectiveCost.value
    )
        return 0;
    return (
        ((formData.value.default_user_billing_rate_per_hour -
            effectiveCost.value) /
            formData.value.default_user_billing_rate_per_hour) *
        100
    ).toFixed(2);
});

watch(
    effectiveCost,
    (val) => {
        formData.value.effective_cost_per_hour = val;
    },
    { immediate: true }
);

watch(
    marginRate,
    (val) => {
        formData.value.margin_rate = val;
    },
    { immediate: true }
);

const save = () => {
    emit('save');
};
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 sm:col-span-6 lg:col-span-6">
            <label class="block mb-3 required">Base Cost / Hour ($)</label>
            <InputField
                :disabled="busy"
                class="w-full"
                id="base_cost_per_hour"
                v-model="formData.base_cost_per_hour"
                variant="number"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                @keyup.enter="save"
                prefix="$"
                :min="1"
            />
        </div>
        <div class="col-span-12 sm:col-span-6 lg:col-span-6">
            <label class="block mb-3 required"
                >Average Overhead Factor (%)</label
            >
            <InputField
                :disabled="busy"
                class="w-full"
                id="average_overhead_factor"
                v-model="formData.average_overhead_factor"
                variant="number"
                @keyup.enter="save"
                suffix="%"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                :min="1"
                :max="99.99"
            />
        </div>
        <div class="col-span-12 sm:col-span-6 lg:col-span-6">
            <label class="block mb-3">Effective Cost / Hour ($)</label>
            <InputField
                :disabled="true"
                class="w-full"
                id="effective_cost_per_hour"
                v-model="effectiveCost"
                variant="number"
                @keyup.enter="save"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                prefix="$"
                :min="1"
            />
        </div>
        <div class="col-span-12 sm:col-span-6 lg:col-span-6">
            <label class="block mb-3 required"
                >Default User Billing Rate / Hour ($)</label
            >
            <InputField
                :disabled="busy"
                class="w-full"
                id="default_user_billing_rate_per_hour"
                v-model="formData.default_user_billing_rate_per_hour"
                variant="number"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                @keyup.enter="save"
                prefix="$"
                :min="1"
            />
        </div>
        <div class="col-span-12 sm:col-span-6 lg:col-span-6">
            <label class="block mb-3">Margin Rate (%)</label>
            <InputField
                :disabled="true"
                class="w-full"
                id="margin_rate"
                v-model="marginRate"
                variant="number"
                @keyup.enter="save"
                suffix="%"
                :maxFractionDigits="2"
                :minFractionDigits="2"
                :min="1"
                :max="99.99"
            />
        </div>
    </div>
</template>
