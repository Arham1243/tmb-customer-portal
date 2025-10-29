<script setup>
import RawField from './RawField.vue';
import { computed } from 'vue';
import { useGlobalStore } from '@/stores';

const globalStore = useGlobalStore();

const props = defineProps({
    id: {
        type: String
    },
    iconBefore: {
        type: String
    },
    iconAfter: {
        type: String
    },
    addonBefore: {
        type: String
    },
    addonAfter: {
        type: String
    },
    dataTestidIcon: {
        type: String
    },
    errorMessages: {
        type: [String, Array]
    }
});

const emit = defineEmits(['iconBeforeClick', 'iconAfterClick']);

const errors = computed(() => {
    if (props.errorMessages && Array.isArray(props.errorMessages)) {
        return props.errorMessages;
    } else if (props.errorMessages && typeof props.errorMessages == 'string') {
        return [props.errorMessages];
    } else if (globalStore.errors) {
        if (globalStore.errors[props.id]) {
            return globalStore.errors[props.id];
        } else {
            const id = props.id + '.en';
            return globalStore.errors[id];
        }
    } else {
        return [];
    }
});
</script>

<template>
    <span
        v-if="iconBefore || iconAfter"
        :class="{
            'p-input-icon-left': iconBefore,
            'p-input-icon-right': iconAfter
        }"
    >
        <i
            v-if="iconBefore"
            :class="iconBefore"
            :data-testid="dataTestidIcon"
            @click.stop="emit('iconBeforeClick')"
        />
        <RawField v-bind="$attrs" />
        <i
            v-if="iconAfter"
            class="cursor-pointer"
            :data-testid="dataTestidIcon"
            :class="iconAfter"
            @click.stop="emit('iconAfterClick')"
        />
    </span>

    <div v-else-if="addonBefore || addonAfter" class="p-inputgroup">
        <span v-if="addonBefore" class="p-inputgroup-addon">
            <i
                :data-testid="dataTestidIcon"
                v-if="addonBefore.includes('pi')"
                :class="addonBefore"
            ></i>
            <span v-else>{{ addonBefore }}</span>
        </span>
        <RawField v-bind="$attrs" />
        <span v-if="addonAfter" class="p-inputgroup-addon">
            <i
                :data-testid="dataTestidIcon"
                v-if="addonAfter.includes('pi')"
                :class="addonAfter"
            ></i>
            <span v-else>{{ addonAfter }}</span>
        </span>
    </div>

    <RawField v-else v-bind="$attrs" />

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

<style lang="scss" scoped></style>
