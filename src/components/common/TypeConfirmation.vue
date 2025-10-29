<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    header: { type: String, default: 'Attention!' },
    message: { type: String, default: 'This action is irreversible.' },
    confirmText: { type: String, default: 'YES' },
    confirmButtonText: { type: String, default: 'Confirm' },
    cancelButtonText: { type: String, default: 'Cancel' }
});

const emit = defineEmits(['confirm', 'update:modelValue', 'cancel']);

const confirmationText = ref('');

const dialog = computed({
    get: () => props.modelValue,
    set: (value) => {
        emit('update:modelValue', value);
        if (!value) {
            confirmationText.value = '';
        }
    }
});

const isConfirmEnabled = computed(() => {
    return confirmationText.value === props.confirmText;
});

// Reset confirmation text when dialog closes
watch(
    () => props.modelValue,
    (newValue) => {
        if (!newValue) {
            confirmationText.value = '';
        }
    }
);

const confirm = () => {
    if (isConfirmEnabled.value) {
        emit('confirm');
        dialog.value = false;
    }
};

const cancel = () => {
    emit('cancel');
    dialog.value = false;
};
</script>

<template>
    <Dialog
        v-model:visible="dialog"
        :header="header"
        modal
        class="w-full sm:w-2/3 md:w-1/2 lg:w-1/3"
    >
        <div class="flex items-center pb-5">
            <i :class="`pi pi-info-circle mr-4 !text-3xl`"></i>
            <p class="text-gray-700 dark:text-gray-200 mb-0">
                {{ message }}
                <br />
                To continue, type <strong>{{ confirmText }}</strong> below.
            </p>
        </div>

        <InputText
            v-model="confirmationText"
            :placeholder="`Type ${confirmText} to confirm`"
            class="w-full mb-4"
            @keyup.enter="confirm"
        />

        <template #footer>
            <Button
                text
                variant="outlined"
                :label="cancelButtonText"
                @click="cancel"
                class="mr-2"
            />
            <Button
                :disabled="!isConfirmEnabled"
                :label="confirmButtonText"
                @click="confirm"
                severity="success"
            />
        </template>
    </Dialog>
</template>
