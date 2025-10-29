import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGlobalStore } from '@/stores';
import { LookupTablePreferenceService } from '@/modules/core/services';

export const useLookupTablePreferenceStore = defineStore(
    'LookupTablePreferenceStore',
    () => {
        const globalStore = useGlobalStore();
        const currentItem = ref(null);

        const getTablePreferences = (params) => {
            return globalStore.actionWrapper(async () => {
                const res =
                    await LookupTablePreferenceService.getTablePreferences(
                        params
                    );
                return res.data;
            });
        };

        const saveTablePreferences = (payload) => {
            return globalStore.actionWrapper(async () => {
                const res =
                    await LookupTablePreferenceService.saveTablePreferences(
                        payload
                    );
                return res.data;
            });
        };
        return {
            getTablePreferences,
            saveTablePreferences
        };
    }
);
