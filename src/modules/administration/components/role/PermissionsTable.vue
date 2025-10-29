<script setup>
import { ref, onBeforeMount, computed, watch } from 'vue';
import { useRoleStore } from '@/modules/administration/stores';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import useEventsBus from '@/composables/useEventsBus';
import { isEqual } from 'lodash-es';

const router = useRouter();
const route = useRoute();
const { emit } = useEventsBus();
const roleStore = useRoleStore();

const loading = ref(false);
const loadingPermissions = ref(false);
const tableData = ref([]);
const selectedPermissions = ref([]);
const rolePermissions = ref([]);
const busy = ref(false);
const item = ref([]);
const roleId = ref(route.params?.id);
const actions = ['view', 'create', 'edit', 'delete'];
const showUnsavedDialog = ref(false);
const allChecked = ref(false);
let nextRoute = null;

onBeforeMount(async () => {
    await getItem();
    emit('updateDetailsBreadcrumb', roleStore.currentItem?.name || '');
    await getRolePermissions();
});

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
        nextRoute = next;
    } else {
        next();
    }
});

watch(
    selectedPermissions,
    () => {
        const perms = Object.values(selectedPermissions.value).flatMap(
            (actions) => Object.values(actions)
        );
        allChecked.value = perms.every((v) => v === true);
    },
    { deep: true }
);

const isDirty = computed(() => {
    return !isEqual(selectedPermissions.value, rolePermissions.value);
});

const buildTableData = () => {
    tableData.value = Object.keys(rolePermissions.value).map((entity) => {
        const perms = rolePermissions.value[entity];
        const selected = selectedPermissions.value[entity] || {};

        const row = { entity };

        Object.keys(perms).forEach((action) => {
            row[action] = selected.hasOwnProperty(action)
                ? selected[action]
                : false;
        });

        return row;
    });
};

function buildPermissionsForBackend(permissions) {
    const result = [];

    Object.entries(permissions).forEach(([entity, actions]) => {
        Object.entries(actions).forEach(([action, value]) => {
            if (value === true) {
                result.push(`${entity}.${action}`);
            }
        });
    });

    return result;
}

function formatEntity(entity) {
    return entity
        .replace(/\./g, ' - ')
        .split(' ')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
}

function togglePermission(entity, action, val) {
    if (!selectedPermissions.value[entity]) {
        selectedPermissions.value[entity] = {};
    }

    if (selectedPermissions.value[entity][action] !== null) {
        selectedPermissions.value[entity][action] = val;
    }
}

function resetMatrix() {
    selectedPermissions.value = [];
    rolePermissions.value = [];
    buildTableData();
}

function cancel() {
    showUnsavedDialog.value = true;
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    if (nextRoute) {
        const go = nextRoute;
        nextRoute = null;
        go();
    } else {
        resetMatrix();
        getRolePermissions();
    }
}

const getItem = async () => {
    try {
        loading.value = true;
        const res = await roleStore.getItem(roleId.value);
        item.value = res.data;
    } finally {
        loading.value = false;
    }
};

const getRolePermissions = async () => {
    try {
        loadingPermissions.value = true;
        const res = await roleStore.getRolePermissions(roleId.value);
        rolePermissions.value = JSON.parse(JSON.stringify(res));
        selectedPermissions.value = JSON.parse(JSON.stringify(res));
        buildTableData();
    } finally {
        loadingPermissions.value = false;
    }
};

const syncRolePermissions = async () => {
    try {
        busy.value = true;
        await roleStore.syncRolePermissions(roleId.value, {
            permissions: buildPermissionsForBackend(selectedPermissions.value)
        });
        resetMatrix();
        getRolePermissions();
    } finally {
        busy.value = false;
    }
};

const toggleAllPermissions = () => {
    Object.keys(selectedPermissions.value).forEach((entity) => {
        Object.keys(selectedPermissions.value[entity]).forEach((action) => {
            selectedPermissions.value[entity][action] = allChecked.value;
        });
    });
    buildTableData();
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <TitleHeader>
            <template #title>
                <div class="flex items-center gap-5">
                    <Button
                        type="button"
                        variant="outlined"
                        icon="pi pi-chevron-left"
                        size="large"
                        @click="router.push({ name: 'User Roles' })"
                        iconClass="!text-sm"
                    />
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                            {{ item?.name }}
                        </h1>
                    </div>
                </div>
            </template>
            <template #actions>
                <Button
                    label="Cancel"
                    variant="outlined"
                    class="w-full sm:w-auto"
                    @click="cancel"
                    :disabled="busy || !isDirty"
                />
                <Button
                    label="Save"
                    icon="pi pi-check"
                    iconPos="left"
                    class="w-full sm:w-auto"
                    @click="syncRolePermissions"
                    :disabled="busy || !isDirty"
                    :loading="busy"
                />
            </template>
        </TitleHeader>

        <Card class="py-3 px-2">
            <template #content>
                <div
                    class="pb-5 col-span-12 sm:col-span-6 flex items-center justify-end space-x-2 pr-7 mb-2"
                    v-if="!loadingPermissions"
                >
                    <ToggleSwitch
                        inputId="allChecked"
                        v-model="allChecked"
                        :disabled="busy || loadingPermissions"
                        @change="toggleAllPermissions"
                    />
                    <label
                        for="allChecked"
                        class="cursor-pointer font-medium mb-0"
                        >Check All</label
                    >
                </div>
                <DataTable :value="tableData" :loading="loadingPermissions">
                    <Column field="entity" header="Permission">
                        <template #body="{ data }">
                            {{ formatEntity(data.entity) }}
                        </template>
                    </Column>

                    <Column
                        v-for="a in actions"
                        :key="a"
                        :field="a"
                        :header="a.charAt(0).toUpperCase() + a.slice(1)"
                    >
                        <template #body="{ data }">
                            <div class="pl-3">
                                <InputField
                                    :disabled="busy"
                                    variant="checkbox"
                                    binary
                                    :modelValue="data[a]"
                                    @update:modelValue="
                                        (val) =>
                                            togglePermission(
                                                data.entity,
                                                a,
                                                val
                                            )
                                    "
                                />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </template>

    <Confirmation
        v-model="showUnsavedDialog"
        header="Unsaved Changes"
        content="You have unsaved changes. If you continue, those changes will be lost. Do you want to discard them?"
        variant="danger"
        confirmButtonText="Discard Changes"
        cancelButtonText="Keep Editing"
        @confirm="confirmDiscard"
    />
</template>
