import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      '.local/**',
      'test-results/**',
      'playwright-report/**',
      'src/payload-types.ts',
      'src/migrations/**',
      'src/app/(payload)/admin/importMap.js',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
]

export default config
