import '@testing-library/jest-dom';

// Mock next/image for SSR-like behavior in tests
jest.mock('next/image', () => {
  const React = require('react');
  function NextImage({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) {
    return React.createElement('img', {
      src,
      alt,
      width,
      height,
      className,
    });
  }
  return NextImage;
});

// Mock CSS modules to return class names directly
jest.mock('@/styles/page.module.css', () => ({
  tabs: 'tabs',
  tab: 'tab',
  active: 'active',
  select: 'select',
  title: 'title',
  container: 'container',
  weatherInfo: 'weatherInfo',
  skeletonSelect: 'skeletonSelect',
  skeletonWeather: 'skeletonWeather',
  skeletonTabs: 'skeletonTabs',
  skeletonTab: 'skeletonTab',
  skeletonCard: 'skeletonCard',
  skeletonLine: 'skeletonLine',
}));

jest.mock('@/styles/base.module.css', () => ({
  container: 'container',
}));

jest.mock('@/styles/Header.module.css', () => ({
  header: 'header',
  logo: 'logo',
  title: 'title',
}));
