<script setup>
import { ref, watch, onMounted, useAttrs, computed } from 'vue';
import { debounce } from 'lodash-es';
import { useGlobalStore } from '@/stores';

const globalStore = useGlobalStore();

const props = defineProps({
    modelValue: [String, Number, Object],
    options: { type: Array, default: () => [] },
    id: {
        type: String
    }
});

const emit = defineEmits(['update:modelValue', 'search', 'change']);
const attrs = useAttrs();

const selected = ref(props.modelValue);
const localOptions = ref(props.options);
const currentSearch = ref('');

watch(
    () => props.modelValue,
    (val) => {
        selected.value = val;
    }
);

watch(
    () => props.options,
    (val) => (localOptions.value = val)
);

const onChange = (event) => {
    emit('update:modelValue', event.value);
    emit('change', event);
};

// Debounced search emitter
const onFilter = debounce((event) => {
    const filterValue = event.value ?? '';
    currentSearch.value = filterValue;
    emit('search', filterValue);
}, 300);

// Trigger initial search if options empty
onMounted(() => {
    if (!localOptions.value.length) {
        emit('search', '');
    }
});

const errors = computed(() => {
    if (props.errorMessages && Array.isArray(props.errorMessages)) {
        return props.errorMessages;
    } else if (props.errorMessages && typeof props.errorMessages == 'string') {
        return [props.errorMessages];
    } else if (globalStore.errors) {
        if (globalStore.errors[props.id]) {
            return globalStore.errors[props.id];
        }
    } else {
        return [];
    }
});
</script>

<template>
    <Select
        v-model="selected"
        :options="localOptions"
        v-bind="attrs"
        @change="onChange"
        @filter="onFilter"
    />
    <small
        v-for="(error, index) in errors"
        :key="index"
        class="mt-[0.35rem] text-[84%] block text-[#e24c4c]"
        :class="{ 'mb-2': index == errors.length - 1 }"
        id="text-error"
        data-testid="validation-error"
    >
        {{ error }}
    </small>
</template>
