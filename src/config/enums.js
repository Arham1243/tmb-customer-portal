export const timesheetStartOptions = [
    { name: 'Weekly', code: 'weekly' },
    { name: 'Daily', code: 'daily' }
];

export const timezones = [
    {
        name: '(UTC-05:00) Eastern Time (US & Canada)',
        code: 'America/New_York'
    },
    { name: '(UTC-06:00) Central Time (US & Canada)', code: 'America/Chicago' },
    { name: '(UTC-07:00) Mountain Time (US & Canada)', code: 'America/Denver' },
    {
        name: '(UTC-08:00) Pacific Time (US & Canada)',
        code: 'America/Los_Angeles'
    }
];

export const dateFormats = [
    { name: 'MM/DD/YYYY', code: 'mm/dd/yy' },
    { name: 'DD/MM/YYYY', code: 'dd/mm/yy' },
    { name: 'YYYY-MM-DD', code: 'yy-mm-dd' }
];

export const weeklyTimesheetDateDisplayOptions = [
    { name: 'MM/DD', code: 'mm/dd' },
    { name: 'DD/MM', code: 'dd/mm' }
];

export const weekDays = [
    { name: 'Sunday', code: 'SU' },
    { name: 'Monday', code: 'MO' },
    { name: 'Tuesday', code: 'TU' },
    { name: 'Wednesday', code: 'WE' },
    { name: 'Thursday', code: 'TH' },
    { name: 'Friday', code: 'FR' },
    { name: 'Saturday', code: 'SA' }
];

export const paymentTypes = [
    { name: 'Regular Invoice', code: 'regular_invoice' },
    { name: 'Prepayment', code: 'prepayment' }
];

export const statusOptions = [
    { name: 'Active', code: true },
    { name: 'Inactive', code: false }
];

export const yesNoOptions = [
    { name: 'Yes', code: true },
    { name: 'No', code: false }
];

export const expenseStatuses = [
    { id: 'draft', name: 'Draft' },
    { id: 'submitted', name: 'Submitted' },
    { id: 'approved', name: 'Approved' },
    { id: 'billed', name: 'Billed' }
];

export const timesheetStatuses = [
    { id: 'draft', name: 'Draft' },
    { id: 'submitted', name: 'Submitted' },
    { id: 'approved', name: 'Approved' },
    { id: 'billed', name: 'Billed' }
];

export const invoiceStatuses = [
    { id: 'draft', name: 'Draft' },
    { id: 'approved', name: 'Approved' }
];

export const invoicesPaymentStatuses = [
    { id: 'unbilled', name: 'Unbilled' },
    { id: 'billed', name: 'Billed' }
];
