<script setup>
import { ref } from 'vue';
import CompanyForm from '@/components/dashboard/profile/CompanyForm.vue';
import { useSessionStore } from '@/stores';
const sessionStore = useSessionStore();
const myCompany = sessionStore.myCompany;
const activeTab = ref('company');
const companyDetails = ref(myCompany);
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
                                icon="pi pi-building"
                                label="Company Info"
                                :class="{
                                    'link-active': activeTab === 'company'
                                }"
                                severity="secondary"
                                text
                                @click="activeTab = 'company'"
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
                        </div>
                    </template>
                </Card>
            </div>
            <div class="col-span-9">
                <Card class="p-3">
                    <template #content>
                        <div v-if="activeTab === 'company'">
                            <CompanyForm :formData="companyDetails" />
                        </div>

                        <div v-else-if="activeTab === 'contacts'">
                            <Contacts />
                        </div>
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>
