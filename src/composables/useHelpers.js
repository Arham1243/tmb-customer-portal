import moment from 'moment';
import { ability } from '@/plugins/ability';
import { useSessionStore } from '@/stores';
import { dateFormats } from '@/config/enums';

const sessionStore = useSessionStore();
const myCompanyDateFormat = sessionStore.myCompany?.date_format || 'dd-mm-yy';

export const useHelpers = () => {
    function formatDate(date, format = myCompanyDateFormat) {
        if (date === 'Invalid date' || !date) return '-';

        const formatObj = dateFormats.find((f) => f.code === format);
        const momentFormat = formatObj ? formatObj.name : 'MM/DD/YYYY';

        return moment.utc(date).format(momentFormat);
    }

    function makeTitleCase(str) {
        return str ? str[0].toUpperCase() + str.slice(1).toLowerCase() : '';
    }

    function filterByPermission(items) {
        return items.filter((item) => {
            const permissions = item.permission;
            if (permissions == null) {
                return true;
            } else if (Array.isArray(permissions)) {
                return permissions.some((permission) =>
                    ability.can(permission)
                );
            } else if (typeof permissions === 'string') {
                return ability.can(permissions);
            }
            return false;
        });
    }

    function filterFileFields(data, fileKeys = []) {
        const result = { ...data };
        for (const key of fileKeys) {
            if (!(result[key] && result[key].startsWith('data:'))) {
                delete result[key];
            }
        }
        return result;
    }

    function mapKeysToIds(item, keys) {
        if (!item) return {};
        const cloned = { ...item };
        keys.forEach((key) => {
            if (Array.isArray(cloned[key])) {
                cloned[key] = cloned[key].map((v) => String(v.id));
            }
        });
        return cloned;
    }

    function makeSlugToTitleCase(slug) {
        if (!slug) return '';
        return slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function moneyFormat(number, showTrailingZeros = true) {
        const currency = 'USD';
        if (isNaN(number)) return '';

        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: showTrailingZeros ? 2 : 0,
            maximumFractionDigits: 2
        });

        return formatter.format(number);
    }

    function isValidUrl(value) {
        if (!value) return false;
        try {
            const u = new URL(value, window.location.origin);
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    }

    function filterActiveWithSelected(categories, selectedId) {
        return categories.filter((c) => c.status || c.id === selectedId);
    }

    function formatHours(hours) {
        const num = parseFloat(hours) || 0;
        return num.toFixed(2);
    }

    function formatPercentage(value) {
        const num = parseFloat(value) || 0;
        return `${num.toFixed(2)}%`;
    }
    function mapVisibleColumns(fields, allColumns) {
        return fields
            .map((field) => allColumns.find((col) => col.field === field))
            .filter(Boolean);
    }

    function makeAddress(details) {
        if (!details) return '';
        const { address, city, state, country, zip } = details;
        return [address, zip, city, state, country].filter(Boolean).join(', ');
    }

    function formatMultiline(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    return {
        formatDate,
        moneyFormat,
        makeTitleCase,
        filterByPermission,
        filterFileFields,
        mapKeysToIds,
        makeSlugToTitleCase,
        isValidUrl,
        formatHours,
        formatPercentage,
        filterActiveWithSelected,
        mapVisibleColumns,
        makeAddress,
        formatMultiline
    };
};
