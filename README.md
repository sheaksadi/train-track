# Modern Nuxt 3 Starter Template

## Overview

A starter template built with [Nuxt 3](https://nuxt.com), for my needs. So I can quickly start a new project.

## Features

- [Nuxt 3](https://nuxt.com) - The intuitive Vue framework
- [TailwindCSS](https://tailwindcss.com) - Utility-first CSS framework
- [Pinia](https://pinia.vuejs.org) - Vue state management
- pre setup directory structure

## Prerequisites

- Node.js (version 16.x or higher)
- npm (version 7.x or higher)

## Quick Start

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <project-name>
```

2. Update dependencies to their latest versions:
```bash
npx npm-check-updates -u
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint and fix files
- `npm run test` - Run tests (if configured)

## Project Structure

```
├── assets/            # Uncompiled assets
├────── css/            # CSS files 
├── components/        # Vue components
├── layouts/           # Layout components
├── pages/            # Application views
├── server/            # Server-side files
├───── api/            # API routes
├── stores/            # Store files
├── plugins/          # Plugin files
└──  public/           # Static files
```

## Customization
### Environment Variables

Create a `.env` file in the root directory:
```env
NUXT_PUBLIC_API_BASE=your-api-url
```

## Deployment

Build the application for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the repository or contact the maintainers.