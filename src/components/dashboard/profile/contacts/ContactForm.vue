<script setup>
import { ref, onBeforeMount } from 'vue';
import { useCustomerStore } from '@/stores';
import { useHelpers } from '@/composables';

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, default: false }
});

const emit = defineEmits(['save', 'cancel', 'update:formData']);

const customerStore = useCustomerStore();
const { filterActiveWithSelected } = useHelpers();
const contactTypes = ref([]);
const loadingContactTypes = ref(false);

onBeforeMount(async () => {
    await getContactTypes();
});

const getContactTypes = async (searchText = '') => {
    try {
        loadingContactTypes.value = true;
        const params = { limit: 300 };
        const payload = { search: { value: searchText } };
        const res = await customerStore.listContactTypes(payload, params);
        contactTypes.value = filterActiveWithSelected(
            res.data,
            props.formData.contact_type_id
        );
    } finally {
        loadingContactTypes.value = false;
    }
};

const updateField = (field, value) => {
    emit('update:formData', { ...props.formData, [field]: value });
};
</script>

<template>
    <div>
        <!-- Cancel and Save Buttons - Top -->
        <div class="flex justify-end gap-3 mb-6">
            <Button
                label="Cancel"
                severity="secondary"
                text
                @click="emit('cancel')"
                :disabled="busy"
            />
            <Button
                label="Save"
                :disabled="busy"
                :loading="busy"
                @click="emit('save')"
            />
        </div>

        <!-- Form Fields -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div class="mb-3 col-span-6">
                <label class="block mb-3">First Name</label>
                <InputField
                    id="first_name"
                    variant="text"
                    :model-value="formData.first_name"
                    @update:model-value="updateField('first_name', $event)"
                    class="w-full"
                    :disabled="true"
                />
            </div>

            <div class="mb-3 col-span-6">
                <label class="block mb-3">Last Name</label>
                <InputField
                    id="last_name"
                    variant="text"
                    :model-value="formData.last_name"
                    @update:model-value="updateField('last_name', $event)"
                    class="w-full"
                    :disabled="true"
                />
            </div>

            <div class="mb-3 col-span-12">
                <label class="block mb-3">Title</label>
                <InputField
                    id="title"
                    variant="text"
                    :model-value="formData.title"
                    @update:model-value="updateField('title', $event)"
                    class="w-full"
                    :disabled="true"
                />
            </div>

            <div class="mb-3 col-span-12">
                <label class="block mb-3 required">Contact Type</label>
                <ApiDropdown
                    id="contact_type_id"
                    showClear
                    filter
                    placeholder="Select"
                    :loading="loadingContactTypes"
                    @search="getContactTypes"
                    :options="contactTypes"
                    optionLabel="name"
                    optionValue="id"
                    :model-value="formData.contact_type_id"
                    @update:model-value="updateField('contact_type_id', $event)"
                    class="w-full"
                    :disabled="true"
                />
            </div>

            <div class="mb-3 col-span-6">
                <label class="block mb-3">Email</label>
                <InputField
                    id="email"
                    variant="text"
                    :model-value="formData.email"
                    @update:model-value="updateField('email', $event)"
                    class="w-full"
                    :disabled="true"
                />
            </div>

            <div class="mb-3 col-span-6">
                <label class="block mb-3">Phone</label>
                <InputField
                    id="phone"
                    variant="text"
                    :model-value="formData.phone"
                    @update:model-value="updateField('phone', $event)"
                    class="w-full"
                    :disabled="busy"
                />
            </div>
        </div>
    </div>
</template>
