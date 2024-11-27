
import * as moment from 'moment';

export function getStartOfWeekTimestamp() {
  let startOfWeek = moment().startOf('week').add(1, 'days');
  if (moment().day() === 0) {
    // in this case now.startOf('week') would be today (sunday) ! we need to adjust
    startOfWeek = moment().subtract(1, 'days').startOf('week').add(1, 'days');
  }
  return startOfWeek;
}

export function getEndOfWeekTimestamp() {
  let startOfWeek = moment().startOf('week').add(1, 'days');
  if (moment().day() === 0) {
    startOfWeek = moment().subtract(1, 'days').startOf('week').add(1, 'days');
  }
  let endOfWeek = startOfWeek.add(6, 'days');
  endOfWeek.set('hour', 23);
  endOfWeek.set('minute', 59);
  endOfWeek.set('second', 59);
  return endOfWeek;
}