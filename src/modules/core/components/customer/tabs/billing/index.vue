<script setup>
import BillingHistory from './tabs/BillingHistory.vue';
import PaymentHistory from './tabs/PaymentHistory.vue';
import { ref } from 'vue';
const activeTab = ref('0');
</script>

<template>
    <Tabs v-model:value="activeTab">
        <TabList>
            <Tab value="0">Billing History</Tab>
            <Tab value="1">Payment History</Tab>
        </TabList>
        <div class="py-4">
            <TabPanels>
                <TabPanel value="0">
                    <BillingHistory />
                </TabPanel>
                <TabPanel value="1">
                    <PaymentHistory />
                </TabPanel>
            </TabPanels>
        </div>
    </Tabs>
</template>
