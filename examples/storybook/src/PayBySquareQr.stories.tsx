import type { Meta, StoryObj } from '@storybook/react-vite';

import { PayBySquareQr } from './PayBySquareQr';

const meta = {
  title: 'PayBySquare/QR',
  component: PayBySquareQr,
  tags: ['autodocs'],
  argTypes: {
    amount: { control: { type: 'number', min: 0, step: 0.01 } },
    size: { control: { type: 'range', min: 96, max: 512, step: 8 } },
    currency: { control: 'text' },
    date: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Runs the zero-dependency `@paybysquare/core` encoder in the browser and renders the resulting payload as a QR. Edit the controls to see the payload and QR update live; invalid input shows the validation error inline.',
      },
    },
  },
} satisfies Meta<typeof PayBySquareQr>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Minimal: Story = {
  args: {
    amount: 25.5,
    iban: 'SK7283300000009111111118',
    beneficiaryName: 'John Doe',
    date: '2026-07-21',
    size: 240,
  },
};

export const AllFields: Story = {
  args: {
    amount: 1234.56,
    iban: 'SK7283300000009111111118',
    swift: 'FIOZSKBAXXX',
    beneficiaryName: 'Acme s.r.o.',
    variableSymbol: '2026001',
    constantSymbol: '0308',
    specificSymbol: '99',
    note: 'Invoice FA20260103',
    beneficiaryAddress1: 'Hlavna 1',
    beneficiaryAddress2: '811 01 Bratislava',
    currency: 'EUR',
    date: '2026-01-03',
    size: 260,
  },
};

export const Diacritics: Story = {
  name: 'Slovak diacritics (UTF-8)',
  args: {
    amount: 25.5,
    iban: 'SK7283300000009111111118',
    beneficiaryName: 'Žltá ľalia, s.r.o.',
    note: 'Faktúra č. 47 — úhrada',
    date: '2026-07-21',
    size: 240,
  },
};

export const LargeAmount: Story = {
  args: {
    amount: 9999999.99,
    iban: 'SK7283300000009111111118',
    beneficiaryName: 'Big Corp a.s.',
    variableSymbol: '1234567890',
    date: '2026-12-31',
    size: 300,
  },
};

export const InvalidIban: Story = {
  name: 'Invalid input (error state)',
  args: {
    amount: 25.5,
    iban: 'NOT-AN-IBAN',
    beneficiaryName: 'John Doe',
    date: '2026-07-21',
  },
};
