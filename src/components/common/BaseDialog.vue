<script setup>
import { ref, watch, nextTick, toRef } from 'vue';
import { useFormDirty } from '@/composables/useFormDirty';

const props = defineProps({
    visible: { type: Boolean, default: false },
    header: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    cancelLabel: { type: String, default: 'Cancel' },
    confirmLabel: { type: String, default: 'Save' },
    isEditMode: { type: Boolean, default: false },
    formData: { type: Object, required: true },
    enableDirtyCheck: { type: Boolean, default: true },
    initialData: { type: Object, default: null },
    hideFooter: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'cancel', 'confirm']);

const { isDirty, resetDirty } = useFormDirty(
    toRef(props, 'formData'),
    toRef(props, 'initialData')
);
const showUnsavedDialog = ref(false);
let pendingClose = false;

// Reset dirty state whenever dialog opens
watch(
    () => props.visible,
    (isVisible, wasVisible) => {
        if (isVisible && !wasVisible) {
            nextTick(() => {
                if (props.isEditMode && props.initialData) {
                    resetDirty(props.initialData);
                } else {
                    resetDirty();
                }
            });
        }
    }
);

// Handle manual visibility changes (closing via "X" or ESC)
function handleVisibilityChange(visible) {
    if (!visible && !pendingClose) {
        handleCancel();
    } else {
        emit('update:visible', visible);
    }
}

// Cancel button or close attempt
function handleCancel() {
    if (props.enableDirtyCheck && isDirty.value) {
        showUnsavedDialog.value = true;
    } else {
        executeClose();
    }
}

// Confirm button triggers parent handler
function handleConfirm() {
    emit('confirm');
}

// Force-close dialog (skip dirty check)
function executeClose() {
    pendingClose = true;
    emit('cancel');
    emit('update:visible', false);
    nextTick(() => {
        pendingClose = false;
    });
}

// User confirmed discard changes
function confirmDiscard() {
    showUnsavedDialog.value = false;
    executeClose();
}

// Expose dirtiness API for parent access
defineExpose({
    isDirty,
    resetDirty
});
</script>

<template>
    <Dialog
        :header="header || (isEditMode ? 'Edit' : 'New')"
        :visible="visible"
        @update:visible="handleVisibilityChange"
        :modal="true"
        v-bind="$attrs"
        class="w-full sm:w-2/3 md:w-1/2 lg:w-1/3"
    >
        <form @submit.prevent="handleConfirm">
            <div class="grid grid-cols-12 gap-4 space-y-1">
                <slot />
            </div>
        </form>

        <template #footer v-if="!props.hideFooter">
            <slot name="footer">
                <Button
                    text
                    variant="outlined"
                    :label="cancelLabel"
                    @click="handleCancel"
                    :disabled="busy"
                    class="mr-2"
                    type="button"
                />
                <Button
                    icon="pi pi-check"
                    iconPos="left"
                    :loading="busy"
                    :disabled="(props.enableDirtyCheck && !isDirty) || busy"
                    :label="confirmLabel"
                    @click="handleConfirm"
                />
            </slot>
        </template>
    </Dialog>

    <Confirmation
        v-model="showUnsavedDialog"
        header="Unsaved Changes"
        content="You have unsaved changes. If you close, those changes will be lost. Do you want to discard them?"
        variant="danger"
        confirmButtonText="Discard Changes"
        cancelButtonText="Keep Editing"
        @confirm="confirmDiscard"
    />
</template>
