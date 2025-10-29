import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useToast } from 'primevue/usetoast';

export const useGlobalStore = defineStore('GlobalStore', () => {
    const toast = useToast();
    const errors = ref(null);
    const loading = ref(false);
    const routeForbidden = ref(false);

    const setLoading = (value) => {
        loading.value = value;
    };

    const setRouteForbidden = (value) => {
        routeForbidden.value = value;
    };

    const clearErrors = () => {
        errors.value = null;
    };

    const setError = (serverError) => {
        if (!serverError) {
            errors.value = null;
            return;
        }
        const summary = 'Oops!';
        let detail = 'Something went wrong';

        if (serverError && serverError.response && serverError.response.data) {
            errors.value = serverError.response.data.errors;

            if (serverError.response.data.message)
                detail = serverError.response.data.message;
        }

        showError(summary, detail);
    };

    const showInfo = (summary, detail) => {
        toast.add({
            severity: 'info',
            summary,
            detail,
            life: 5000
        });
    };

    const showSuccess = (summary, detail) => {
        toast.add({
            severity: 'success',
            summary,
            detail,
            life: 5000
        });
    };

    const showError = (summary, detail) => {
        toast.add({
            severity: 'error',
            summary,
            detail,
            life: 3000
        });
    };

    const showToast = (severity, summary, detail, life = 5000) => {
        toast.add({
            severity,
            summary,
            detail,
            life
        });
    };

    const actionWrapper = async (action) => {
        try {
            setLoading(true);
            clearErrors();
            const response = await action();
            return response;
        } catch (err) {
            if (err.response && err.response.status !== 401) setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        errors,
        loading,
        routeForbidden,
        setRouteForbidden,
        clearErrors,
        showInfo,
        showSuccess,
        showError,
        showToast,
        actionWrapper
    };
});
