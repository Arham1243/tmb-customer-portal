<script setup>
import { ref, onBeforeMount } from 'vue';
import { useSessionStore, useCustomerStore } from '@/stores';
import ContactFormAdd from './contacts/ContactFormAdd.vue';
import ContactForm from './contacts/ContactForm.vue';

const sessionStore = useSessionStore();
const customerStore = useCustomerStore();
const customer = sessionStore.user;
const loading = ref(false);
const busy = ref(false);
const contacts = ref([]);
const showAddForm = ref(false);
const editContactId = ref(null);
const formData = ref({
    first_name: '',
    last_name: '',
    title: '',
    contact_type_id: '',
    email: '',
    phone: '',
    address: customer?.address || '',
    country: customer?.country,
    state: customer?.state,
    city: customer?.city,
    zip: customer?.zip || '',
    default_invoice_receipient: false
});

onBeforeMount(async () => {
    await getItems();
});

const resetForm = () => {
    formData.value = {
        first_name: '',
        last_name: '',
        title: '',
        contact_type_id: '',
        email: '',
        phone: '',
        address: customer?.address || '',
        country: customer?.country,
        state: customer?.state,
        city: customer?.city,
        zip: customer?.zip || '',
        default_invoice_receipient: false
    };
    editContactId.value = null;
};

const getItems = async () => {
    try {
        loading.value = true;
        const params = { limit: 1000000 };
        const payload = {
            includes: [{ relation: 'contactType' }],
            filters: [
                { field: 'customer_id', operator: '=', value: customer.id }
            ]
        };
        const res = await customerStore.searchContacts(payload, params);
        contacts.value = res.data;
    } finally {
        loading.value = false;
    }
};

const openAddForm = () => {
    resetForm();
    showAddForm.value = true;
};

const startEdit = (contact) => {
    editContactId.value = contact.id;
    formData.value = { ...contact };
};

const cancelEdit = () => {
    editContactId.value = null;
    resetForm();
};

const closeAddForm = () => {
    showAddForm.value = false;
    cancelEdit();
};

const save = async () => {
    busy.value = true;
    try {
        const payload = {
            ...formData.value,
            customer_id: customer.id
        };

        if (editContactId.value) {
            await customerStore.updateContact(editContactId.value, payload);
        } else {
            await customerStore.createContact(payload);
        }

        await getItems();
        showAddForm.value = false;
        cancelEdit();
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <div class="flex items-center justify-between mb-7">
        <h3 class="text-2xl font-bold">Contacts</h3>
        <Button
            icon="pi pi-plus"
            label="Add Contact"
            :disabled="loading"
            @click="openAddForm"
        />
    </div>

    <Loader v-if="loading" />
    <template v-else>
        <!-- Add Form Card - Only show when showAddForm is true -->
        <Card v-if="showAddForm" class="mb-10">
            <template #content>
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xl font-semibold">New Contact</h4>
                    <Button
                        icon="pi pi-times"
                        rounded
                        text
                        severity="secondary"
                        @click="closeAddForm"
                        :disabled="busy"
                    />
                </div>
                <ContactFormAdd
                    v-model:formData="formData"
                    :busy="busy"
                    @save="save"
                />
            </template>
        </Card>

        <!-- Contact Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 gap-y-5">
            <div
                class="col-span-6"
                v-for="contact in contacts"
                :key="contact.id"
            >
                <Card>
                    <template #content>
                        <template v-if="editContactId !== contact.id">
                            <div class="space-y-2 text-base">
                                <div class="text-right mb-4">
                                    <Button
                                        icon="pi pi-pencil"
                                        class="!p-2"
                                        label="Edit"
                                        text
                                        severity="secondary"
                                        @click="startEdit(contact)"
                                    />
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Name</span>
                                    <span class="font-semibold text-gray-900">
                                        {{ contact.first_name }}
                                        {{ contact.last_name }}
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Email</span>
                                    <span class="font-semibold text-gray-900">{{
                                        contact.email
                                    }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Phone</span>
                                    <span class="font-semibold text-gray-900">{{
                                        contact.phone
                                    }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Title</span>
                                    <span class="font-semibold text-gray-900">{{
                                        contact.title
                                    }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600"
                                        >Contact Type</span
                                    >
                                    <span class="font-semibold text-gray-900">
                                        {{ contact.contactType?.name }}
                                    </span>
                                </div>
                            </div>
                        </template>

                        <!-- Edit Form - Inside Card -->
                        <template v-else>
                            <ContactForm
                                :key="editContactId"
                                v-model:formData="formData"
                                :busy="busy"
                                @cancel="cancelEdit"
                                @save="save"
                            />
                        </template>
                    </template>
                </Card>
            </div>
        </div>
    </template>
</template>
