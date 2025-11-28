<script setup>
import { computed } from 'vue';

const props = defineProps({
    status: {
        type: String
    }
});

const tagProps = computed(() => {
    const rawStatus = props.status || '-';
    const value = rawStatus.replace(/_/g, ' ').toUpperCase();

    switch (rawStatus.toLowerCase()) {
        case 'yes':
        case 'active':
        case 'billed':
        case 'paid':
        case 'connected':
        case 'approved':
        case 'posted':
        case 'payment':
        case 'settled':
            return { value, severity: 'success' };
        case 'no':
        case 'inactive':
        case 'not_connected':
        case 'not_posted':
        case 'declined':
            return { value, severity: 'danger' };
        case 'unbilled':
        case 'pending':
        case 'submitted':
        case 'invoice':
        case 'partially_paid':
            return { value, severity: 'warn' };
        case 'draft':
        case 'unpaid':
            return { value, class: '!bg-gray-200 !text-gray-500' };
        case 'new':
            return { value, severity: 'info' };
        default:
            return { value, severity: 'contrast' };
    }
});
</script>

<template>
    <Tag
        class="!text-xs"
        v-bind="$attrs"
        :value="tagProps.value"
        :severity="tagProps.severity"
        :class="tagProps.class"
    />
</template>
