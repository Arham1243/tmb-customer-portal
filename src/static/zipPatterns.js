export default {
    'United States': { regex: /^\d{5}(-\d{4})?$/, mask: '99999-9999' },
    Canada: { regex: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, mask: 'A1A 1A1' },
    'United Kingdom': {
        regex: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
        mask: 'AA9A 9AA'
    },
    France: { regex: /^\d{5}$/, mask: '99999' },
    Germany: { regex: /^\d{5}$/, mask: '99999' },
    Australia: { regex: /^\d{4}$/, mask: '9999' },
    India: { regex: /^\d{6}$/, mask: '999999' },
    Japan: { regex: /^\d{3}-\d{4}$/, mask: '999-9999' },
    Italy: { regex: /^\d{5}$/, mask: '99999' },
    Brazil: { regex: /^\d{5}-\d{3}$/, mask: '99999-999' },
    Russia: { regex: /^\d{6}$/, mask: '999999' },
    China: { regex: /^\d{6}$/, mask: '999999' },
    Mexico: { regex: /^\d{5}$/, mask: '99999' },
    Netherlands: { regex: /^\d{4}\s?[A-Z]{2}$/, mask: '9999 AA' },
    Spain: { regex: /^\d{5}$/, mask: '99999' },
    Sweden: { regex: /^\d{3}\s?\d{2}$/, mask: '999 99' },
    Switzerland: { regex: /^\d{4}$/, mask: '9999' },
    Belgium: { regex: /^\d{4}$/, mask: '9999' },
    Austria: { regex: /^\d{4}$/, mask: '9999' },
    Ireland: { regex: /^[A-Za-z]\d{2}\s?[A-Za-z0-9]{4}$/, mask: 'A99 AAAA' },
    'New Zealand': { regex: /^\d{4}$/, mask: '9999' },
    'South Africa': { regex: /^\d{4}$/, mask: '9999' }
};
