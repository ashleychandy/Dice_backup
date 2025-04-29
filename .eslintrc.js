module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    // Detect unused code
    'no-unused-vars': ['warn', { 
      varsIgnorePattern: '^_', 
      argsIgnorePattern: '^_' 
    }],
    // Prevent duplicate imports
    'no-duplicate-imports': 'error',
    // Prevent unnecessary useEffect dependencies
    'react-hooks/exhaustive-deps': 'warn',
    // Enforce hooks rules
    'react-hooks/rules-of-hooks': 'error',
    // Provide React automatically when using JSX
    'react/react-in-jsx-scope': 'off',
    // Prevent prop drilling by limiting component props
    'react/prop-types': 'off',
    // Line endings
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
      },
    },
  },
}; 