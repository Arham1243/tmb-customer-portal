import { ref, watch, computed } from 'vue';
import statesData from '@/static/states.json';
import zipPatterns from '@/static/zipPatterns.js';

export function useCountryStateZip(formData) {
    const statesOptions = ref([]);

    const errors = ref({
        state: [],
        zip: []
    });

    const currentZipPattern = ref(null);

    const getStates = (type = 'load') => {
        const selected = statesData.find(
            (c) => c.name === formData.value.country
        );

        statesOptions.value = selected
            ? selected.states.map((s) => ({ name: s }))
            : [];

        if (type === 'change') {
            formData.value.state = '';
            if (!formData.value.country) {
                errors.value.state = [
                    'Please select a country before choosing a state.'
                ];
            } else {
                errors.value.state = [];
            }
        } else {
            errors.value.state = [];
        }

        currentZipPattern.value = zipPatterns[formData.value.country] || null;

        validateZip();
    };

    const validateZip = () => {
        const value = formData.value.zip;

        if (!value) {
            errors.value.zip = [];
            return;
        }

        if (
            currentZipPattern.value &&
            !currentZipPattern.value.regex.test(value)
        ) {
            errors.value.zip = [
                `Invalid ZIP format. Expected: ${currentZipPattern.value.mask}`
            ];
        } else {
            errors.value.zip = [];
        }
    };

    watch(
        () => formData.value.country,
        () => {
            getStates('change');
        }
    );

    const isZipValid = computed(() => {
        const zip = formData.value.zip;
        if (!zip) return true;
        return errors.value.zip.length === 0;
    });

    return {
        statesOptions,
        errors,
        getStates,
        validateZip,
        isZipValid
    };
}
