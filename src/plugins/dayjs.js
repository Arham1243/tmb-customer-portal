import dayjs from 'dayjs/esm/index.js';
import weekday from 'dayjs/esm/plugin/weekday/index.js';
import isoWeek from 'dayjs/esm/plugin/isoWeek/index.js';
import utc from 'dayjs/esm/plugin/utc/index.js';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(utc);

export default dayjs;
