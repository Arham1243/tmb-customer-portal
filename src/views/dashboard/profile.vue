<script setup>
import { ref } from 'vue';
import CustomerForm from '@/components/dashboard/profile/CustomerForm.vue';
import { useSessionStore } from '@/stores';
const sessionStore = useSessionStore();
const customer = sessionStore.customer;
const activeTab = ref('customer');
const customerDetails = ref(customer);
</script>

<template>
    <div class="container mx-auto pt-10 pb-20">
        <div class="grid grid-cols-12 gap-4 space-y-1">
            <div class="col-span-3">
                <Card>
                    <template #content>
                        <div class="flex flex-col space-y-3">
                            <Button
                                class="!justify-start !py-4"
                                icon="pi pi-user"
                                label="Customer Info"
                                :class="{
                                    'link-active': activeTab === 'customer'
                                }"
                                severity="secondary"
                                text
                                @click="activeTab = 'customer'"
                            />
                            <Button
                                icon="pi pi-users"
                                class="!justify-start !py-4"
                                :class="{
                                    'link-active': activeTab === 'contacts'
                                }"
                                label="Contacts"
                                severity="secondary"
                                text
                                @click="activeTab = 'contacts'"
                            />
                            <Button
                                icon="pi pi-credit-card"
                                class="!justify-start !py-4"
                                :class="{
                                    'link-active':
                                        activeTab === 'payment-methods'
                                }"
                                label="Payment Methods"
                                severity="secondary"
                                text
                                @click="activeTab = 'payment-methods'"
                            />
                        </div>
                    </template>
                </Card>
            </div>
            <div class="col-span-9">
                <Card class="p-3">
                    <template #content>
                        <div v-if="activeTab === 'customer'">
                            <CustomerForm :formData="customerDetails" />
                        </div>

                        <div v-else-if="activeTab === 'contacts'">
                            <ContactsDetails />
                        </div>

                        <div v-else-if="activeTab === 'payment-methods'">
                            <PaymentMethods />
                        </div>
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>
