# Elevator Pitch App

Elevator Pitch is a web application that allows individuals or organisations to create shareable links to communicate their skills and close opportunities.

The product is for,
- Graduates seeking for job and looking for unique ways to pitch their skills
- Students seeking internships by sharing their portfolios
- Agencies looking to close clients by pitching them specific case studies

## Tech Stack
- Typescript and Tailwind
- Next JS for application framework
- Postgres via Supabase, dev server on Docker using Supabase CLI
- Deployed via Netlify
- Github for remote repository

## Other Tools
- Cursor for development
- Cursor rules specified to preserve sensitive variables
- DATABASE_SETUP and SUPABASE_SETUP defines database schema and migrations in detail
- DEPLOYMENT_CHECKLIST_STATUS has pointers to crosscheck security before major deployments
- PKCE_IMPLEMENTATION clarifies auth details
- WIDGET_README defines how to use widgets
- /prd-files holds PRD for each development phases and other docuements related to design and UI copy

## Licenses
- The code is opensourced as AGPL 3.0 LICENSE.txt attached to the main codebase, all subsequent code falls under AGPL 3.0 license unless the file clearly specfies otherwise
- The widget embed codebase has a MIT License allowing free use for embeds in third party websites

## Installation

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
