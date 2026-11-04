import '@testing-library/jest-dom';

// Mock CSS modules to return class names directly
jest.mock('@/styles/page.module.css', () => ({
  tabs: 'tabs',
  tab: 'tab',
  active: 'active',
  select: 'select',
  title: 'title',
  container: 'container',
  weatherInfo: 'weatherInfo',
}));

jest.mock('@/styles/base.module.css', () => ({
  container: 'container',
}));

jest.mock('@/styles/Header.module.css', () => ({
  header: 'header',
  logo: 'logo',
  title: 'title',
}));
