import '@testing-library/jest-dom';

// Mock CSS modules to return class names directly
jest.mock('../app/styles.module.css', () => ({
  tabs: 'tabs',
  tab: 'tab',
  active: 'active',
  select: 'select',
  title: 'title',
  container: 'container',
  weatherInfo: 'weatherInfo',
}));
