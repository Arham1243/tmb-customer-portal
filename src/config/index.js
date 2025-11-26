export class PaginationOptions {
    constructor(page = 1, limit = 10, options = [10, 40, 60, 80, 100]) {
        this.page = page;
        this.limit = limit;
        this.rowsPerPageOptions = options;
    }

    getPageParams = () => {
        return {
            page: this.page,
            limit: this.limit
        };
    };

    resetPageParams = () => {
        this.page = 1;
    };

    updatePageParams = (event) => {
        this.page = event.page + 1;
        this.limit = event.rows;
    };
}

export class SortFilterOptions {
    constructor(search = '', sort = [], filters = []) {
        this.search = search;
        this.sort = sort;
        this.filters = filters;
    }

    getSortFilters = () => {
        return {
            search: {
                value: this.search
            },
            sort: this.sort,
            filters: this.filters
        };
    };

    resetSortFilters = () => {
        this.search = '';
        this.sort = [];
        this.filters = [];
    };

    updateSearch = (search) => {
        this.search = search;
    };

    updateSortFilters = (event) => {
        if (event && event.sortField) {
            this.sort = [
                {
                    field: event.sortField,
                    direction: event.sortOrder == 1 ? 'asc' : 'desc'
                }
            ];
        } else this.sort = [];
    };

    updateFilters = (field, value, operator = '=') => {
        const existingFilterIndex = this.filters.findIndex(
            (filter) => filter.field === field
        );

        if (existingFilterIndex !== -1) {
            this.filters[existingFilterIndex] = { field, operator, value };
        } else {
            this.filters.push({ field, operator, value });
        }
    };
}

export * from './enums';
