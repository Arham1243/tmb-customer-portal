<script setup>
import { ref, watch, onMounted, useAttrs } from 'vue';
import { debounce } from 'lodash-es';
import MultiSelect from 'primevue/multiselect';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    options: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:modelValue', 'search', 'change']);
const attrs = useAttrs();

const selected = ref([...props.modelValue]);
const localOptions = ref([...props.options]);
const currentSearch = ref('');

watch(
    () => props.modelValue,
    (val) => {
        selected.value = Array.isArray(val) ? [...val] : [];
    }
);

watch(
    () => props.options,
    (val) => (localOptions.value = Array.isArray(val) ? [...val] : [])
);

const onChange = (event) => {
    emit('update:modelValue', event.value);
    emit('change', event);
};

const onFilter = debounce((event) => {
    const filterValue = event.value ?? '';
    currentSearch.value = filterValue;
    emit('search', filterValue);
}, 300);

onMounted(() => {
    if (!localOptions.value.length) {
        emit('search', '');
    }
});
</script>

<template>
    <MultiSelect
        display="chip"
        :maxSelectedLabels="2"
        v-model="selected"
        :options="localOptions"
        v-bind="attrs"
        @change="onChange"
        @filter="onFilter"
    />
</template>
