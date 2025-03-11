# Adventures in Speech Pathology

This is a website for speech therapy professionals built with React, TypeScript, and Tailwind CSS.

## Color Theme
- Primary Green: #2bcd82
- Secondary Coral: #fb6a69

## Features

- Modern, responsive design
- Membership-focused content
- Resource sharing for speech pathologists
- Community building features
- Secure payment processing with Stripe

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm or yarn
- Stripe account for payment processing

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Replace the Stripe API keys with your actual keys from your Stripe dashboard

```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Payment Integration

This project uses Stripe for secure payment processing. To set up Stripe:

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Add your publishable key to the `.env` file as `VITE_STRIPE_PUBLISHABLE_KEY`
4. For production, set up webhook endpoints and add the webhook secret to `.env`

## Project Structure

- `src/components` - Reusable UI components
- `src/assets` - Static assets like images and icons
- `public` - Public assets

## Component Library

- `Button` - Reusable button component with primary/secondary variants
- `Header` - Site header with navigation
- `Footer` - Site footer with links and contact info
- `HomePage` - Main landing page

## Built With

- [React](https://reactjs.org/) - Frontend library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
