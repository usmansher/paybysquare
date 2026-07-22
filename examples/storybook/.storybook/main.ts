import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-mcp', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  // On GitHub Pages the site is served from a repo sub-path (e.g. /paybysquare/);
  // the deploy workflow sets SB_BASE so assets resolve. Defaults to '/' locally.
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    base: process.env.SB_BASE ?? '/',
  }),
};

export default config;
