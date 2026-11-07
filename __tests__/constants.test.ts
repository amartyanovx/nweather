import { DAYS_OF_WEEK } from '@/lib/constants';

describe('DAYS_OF_WEEK', () => {
  test('contains all days in correct Russian order', () => {
    expect(DAYS_OF_WEEK).toEqual([
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота',
      'Воскресенье',
    ]);
  });
});
