# @puglieseweb-ltd/shared-astro-ui

Shared Astro components for puglieseweb LTD product websites — Noteble, FaceGov, SystemDox, and puglieseweb.com.

Published to [GitHub Packages](https://github.com/puglieseweb-ltd/shared-astro-ui/pkgs/npm/shared-astro-ui) as `@puglieseweb-ltd/shared-astro-ui`.

## Setup

### 1. Create a GitHub Personal Access Token

You need a GitHub PAT with `read:packages` scope to install from GitHub Packages.

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Select the `read:packages` scope
4. Copy the token

### 2. Configure `.npmrc` in your project root

Create or update `.npmrc` in your consuming project:

```ini
@puglieseweb-ltd:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

This routes all `@puglieseweb-ltd/*` packages to GitHub Packages and reads the auth token from the `NODE_AUTH_TOKEN` environment variable.

### 3. Set the environment variable

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export NODE_AUTH_TOKEN=ghp_your_token_here
```

In CI/CD (GitHub Actions), `NODE_AUTH_TOKEN` is set automatically via `secrets.GITHUB_TOKEN` when using `actions/setup-node` with `registry-url: https://npm.pkg.github.com`.

### 4. Install the package

```bash
# npm
NODE_AUTH_TOKEN=$(gh auth token) npm install @puglieseweb-ltd/shared-astro-ui

# pnpm
NODE_AUTH_TOKEN=$(gh auth token) pnpm add @puglieseweb-ltd/shared-astro-ui
```

> **Tip:** If you have the [GitHub CLI](https://cli.github.com/) installed, `gh auth token` returns a valid token — useful for one-off installs without setting the env var permanently.

### 5. Tailwind CSS source

If your project uses Tailwind, add the shared package to your CSS source so Tailwind scans its classes:

```css
/* In your global CSS file */
@source "../../node_modules/@puglieseweb-ltd/shared-astro-ui/src";
```

## Components

### BaseLayout

Root HTML layout with SEO meta tags, Open Graph, Twitter Cards, and JSON-LD support.

```astro
import BaseLayout from '@puglieseweb-ltd/shared-astro-ui/layouts/BaseLayout.astro';

<BaseLayout
  title="Page Title"
  description="Page description for SEO"
  canonicalUrl="https://www.example.com/page"
  siteName="My Product"
  ogImage="https://www.example.com/og.png"
  jsonLd={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'My Product' }}
  noIndex={false}
>
  <Fragment slot="header"><nav>...</nav></Fragment>
  <main>Page content</main>
  <Fragment slot="footer"><footer>...</footer></Fragment>
</BaseLayout>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Page title (used in `<title>` and OG tags) |
| `description` | `string` | Yes | — | Meta description |
| `canonicalUrl` | `string` | Yes | — | Canonical URL |
| `siteName` | `string` | Yes | — | Site name for OG tags |
| `ogImage` | `string` | No | — | Open Graph image URL |
| `jsonLd` | `object \| object[]` | No | — | Schema.org JSON-LD data |
| `noIndex` | `boolean` | No | `false` | Add `noindex, nofollow` meta tag |

**Slots:** `head`, `header`, default (main content), `footer`

---

### MarketingHeader

Fixed navigation bar with mobile hamburger menu, language switcher, and CTA button.

```astro
import MarketingHeader from '@puglieseweb-ltd/shared-astro-ui/components/MarketingHeader.astro';

<MarketingHeader
  brandName="Noteble"
  navItems={[
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
  ]}
  ctaLabel="Start Free Trial"
  ctaHref="https://app.noteble.ai/signup"
  signInLabel="Sign In"
  signInHref="https://app.noteble.ai/signin"
  languages={{ en: 'English', it: 'Italiano' }}
  currentLang="en"
  currentPath="/features"
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `brandName` | `string` | Yes | — | Brand name displayed in the header |
| `brandGradient` | `string` | No | — | Custom gradient CSS class for brand text |
| `homeHref` | `string` | No | `/` | Home link for the brand name |
| `navItems` | `{ label, href }[]` | Yes | — | Navigation links |
| `ctaLabel` | `string` | No | — | CTA button label |
| `ctaHref` | `string` | No | — | CTA button URL |
| `signInLabel` | `string` | No | — | Sign-in link label |
| `signInHref` | `string` | No | — | Sign-in link URL |
| `currentPath` | `string` | No | — | Current page path (for active link highlighting) |
| `languages` | `Record<string, string>` | No | — | Language switcher options (`{ code: label }`) |
| `currentLang` | `string` | No | — | Current language code |
| `defaultLang` | `string` | No | `'en'` | Default language code |

---

### MarketingFooter

Footer with link groups, brand gradient, and auto-calculated copyright year.

```astro
import MarketingFooter from '@puglieseweb-ltd/shared-astro-ui/components/MarketingFooter.astro';

<MarketingFooter
  brandName="Noteble"
  tagline="AI-powered document creation platform."
  linkGroups={[
    { title: 'Product', links: [{ label: 'Features', href: '/features' }] },
    { title: 'Company', links: [{ label: 'Contact', href: '/contact' }] },
  ]}
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `brandName` | `string` | Yes | — | Brand name |
| `brandGradient` | `string` | No | — | Custom gradient CSS class |
| `homeHref` | `string` | No | `/` | Home link for the brand name |
| `tagline` | `string` | Yes | — | Tagline below brand name |
| `linkGroups` | `{ title, links: { label, href }[] }[]` | Yes | — | Footer link columns |
| `currentLang` | `string` | No | — | Current language code |
| `defaultLang` | `string` | No | `'en'` | Default language code |

---

### HeroSection

Above-the-fold hero with headline, subtitle, badge, and CTA buttons.

```astro
import HeroSection from '@puglieseweb-ltd/shared-astro-ui/components/HeroSection.astro';

<HeroSection
  headline="Create documents with"
  highlightedText="AI"
  subtitle="Generate professional documentation in minutes."
  badge="Now in Beta"
  ctas={[
    { label: 'Get Started', href: '/signup', variant: 'primary' },
    { label: 'Learn More', href: '/features', variant: 'secondary' },
  ]}
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `headline` | `string` | Yes | — | Main heading text |
| `highlightedText` | `string` | No | — | Gradient-highlighted text appended to headline |
| `subtitle` | `string` | Yes | — | Subtitle paragraph |
| `badge` | `string` | No | — | Badge text above the headline |
| `ctas` | `{ label, href, variant? }[]` | No | — | CTA buttons (`variant`: `'primary'` or `'secondary'`) |

---

### SectionHeader

Reusable section title with optional badge.

```astro
import SectionHeader from '@puglieseweb-ltd/shared-astro-ui/components/SectionHeader.astro';

<SectionHeader
  title="Key Features"
  subtitle="Everything you need to create great docs."
  badge="Features"
  badgeColor="blue"
>
  <Icon slot="badge-icon" name="star" />
</SectionHeader>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Section title |
| `subtitle` | `string` | No | — | Subtitle below the title |
| `badge` | `string` | No | — | Badge text |
| `badgeColor` | `'blue' \| 'purple' \| 'amber' \| 'emerald' \| 'rose'` | No | `'blue'` | Badge color variant |

**Slots:** `badge-icon`

---

### FeatureCard

Feature card for grid layouts with icon, description, and feature list.

```astro
import FeatureCard from '@puglieseweb-ltd/shared-astro-ui/components/FeatureCard.astro';

<FeatureCard
  title="AI Generation"
  description="Generate documents from a simple prompt."
  features={['Smart templates', 'Multiple formats', 'Custom styles']}
  iconColor="blue"
>
  <Icon slot="icon" name="sparkles" />
</FeatureCard>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Card title |
| `description` | `string` | Yes | — | Card description |
| `features` | `string[]` | No | — | Checklist of features |
| `iconColor` | `'blue' \| 'emerald' \| 'purple' \| 'amber' \| 'rose' \| 'cyan'` | No | `'blue'` | Icon background color |

**Slots:** `icon`

---

### UseCaseCard

Simpler card for use case grids.

```astro
import UseCaseCard from '@puglieseweb-ltd/shared-astro-ui/components/UseCaseCard.astro';

<UseCaseCard title="Engineering Teams" description="Technical docs, runbooks, and ADRs.">
  <Icon slot="icon" name="code" />
</UseCaseCard>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Card title |
| `description` | `string` | Yes | — | Card description |

**Slots:** `icon`

---

### BenefitsList

Bulleted benefits list with checkmark icons.

```astro
import BenefitsList from '@puglieseweb-ltd/shared-astro-ui/components/BenefitsList.astro';

<BenefitsList
  benefits={['Save hours of writing', 'Consistent formatting', 'Export anywhere']}
  columns={2}
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `benefits` | `string[]` | Yes | — | List of benefit strings |
| `columns` | `1 \| 2` | No | `1` | Number of columns |

---

### CTASection

Call-to-action banner with gradient background.

```astro
import CTASection from '@puglieseweb-ltd/shared-astro-ui/components/CTASection.astro';

<CTASection
  title="Ready to get started?"
  subtitle="Try it free — no credit card required."
  ctaLabel="Start Free Trial"
  ctaHref="https://app.noteble.ai/signup"
/>
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Heading |
| `subtitle` | `string` | No | — | Subtitle |
| `ctaLabel` | `string` | Yes | — | Button label |
| `ctaHref` | `string` | Yes | — | Button URL |

---

### ContactPage

Contact page section with optional form, contact cards grid, and company details. Three usage patterns:

#### Form with sidebar (e.g. Noteble)

```astro
import ContactPage from '@puglieseweb-ltd/shared-astro-ui/components/ContactPage.astro';
import { Mail, Send, ArrowRight } from 'lucide-astro';

<ContactPage
  apiUrl="https://api.puglieseweb.com"
  product="noteble"
  contactEmail="hello@noteble.ai"
  ctaCard={{
    title: 'Ready to start?',
    description: 'Try Noteble free — no credit card required.',
    label: 'Start Free Trial',
    href: 'https://app.noteble.ai/signup',
  }}
>
  <Send slot="submit-icon" size={18} />
  <Mail slot="email-icon" class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
  <ArrowRight slot="arrow-icon" size={16} />
  <ArrowRight slot="cta-arrow-icon" size={16} />
</ContactPage>
```

#### Info-only with contact cards (e.g. puglieseweb.com)

```astro
<ContactPage
  headingPrefix="Get in"
  headingHighlight="Touch"
  subtitle="We'd love to hear from you."
  contactCards={[
    { title: 'General Enquiries', description: 'For questions about our company or products.', email: 'info@puglieseweb.com' },
    { title: 'Noteble Support', description: 'Need help with Noteble? Our support team is here.', email: 'support@noteble.ai' },
    { title: 'SystemDox Support', description: 'Questions about SystemDox? Get in touch.', email: 'support@systemdox.com' },
    { title: 'Legal', description: 'For legal or compliance matters.', email: 'legal@puglieseweb.com' },
  ]}
  companyDetailsTitle="Company Details"
  companyDetails={[
    { label: 'Company', value: 'PuglieseWeb LTD' },
    { label: 'Location', value: 'United Kingdom' },
  ]}
/>
```

#### Form + contact cards + company details (combined)

All props can be used together — pass `apiUrl` to show the form, `contactCards` for the grid, and `companyDetails` for the footer section.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `headingPrefix` | `string` | No | `'Get in'` | Text before the highlighted word |
| `headingHighlight` | `string` | No | `'Touch'` | Gradient-highlighted heading word |
| `subtitle` | `string` | No | `'Have a question...'` | Subtitle paragraph |
| **Form props** | | | | *Omit `apiUrl` to hide the form entirely* |
| `apiUrl` | `string` | No | — | API endpoint for form submission |
| `product` | `string` | No | — | Product identifier sent with form data |
| `labels` | `{ name?, email?, subject?, message?, submit? }` | No | English defaults | Form field labels |
| `placeholders` | `{ name?, email?, subject?, message? }` | No | English defaults | Form field placeholders |
| `subjects` | `{ value, label }[]` | No | Demo, Pricing, Support, Partnership, Other | Subject dropdown options |
| `successMessage` | `{ title?, description? }` | No | `'Message Sent!'` | Success state text |
| `errorMessage` | `string` | No | Auto-generated with email | Error state text |
| `sendingText` | `string` | No | `'Sending...'` | Button text while submitting |
| **Sidebar props** | | | | *Shown next to the form* |
| `contactEmail` | `string` | No | — | Email shown in sidebar card |
| `emailCard` | `{ title?, description? }` | No | `'Email Us'` | Sidebar email card text |
| `ctaCard` | `{ title?, description?, label?, href? }` | No | — | Sidebar CTA card (hidden if no `href`) |
| **Contact cards** | | | | *Grid shown below heading* |
| `contactCards` | `{ title, description, email }[]` | No | — | Grid of contact email cards |
| **Company details** | | | | *Section shown at the bottom* |
| `companyDetailsTitle` | `string` | No | — | Company details section heading |
| `companyDetails` | `{ label, value }[]` | No | — | Key-value pairs |

**Slots:** `submit-icon`, `email-icon`, `arrow-icon`, `cta-arrow-icon`

---

## i18n Utilities

Generic internationalization helpers. Translation files live in each product repo.

```typescript
import { getLangFromUrl, useTranslations, getLocalePath } from '@puglieseweb-ltd/shared-astro-ui/lib/i18n';
```

### `getLangFromUrl(url, supportedLangs, defaultLang?)`

Extract language code from a URL pathname.

```typescript
const lang = getLangFromUrl(Astro.url, ['en', 'it']); // '/it/contact' → 'it'
```

### `useTranslations(translations, lang, replacements?)`

Returns a `t()` function for looking up translation keys. Supports dot notation and `{{placeholder}}` replacement.

```typescript
const t = useTranslations({ en: { greeting: 'Hello {{name}}' }, it: { greeting: 'Ciao {{name}}' } }, 'en', { name: 'World' });
t('greeting'); // → 'Hello World'
```

### `getLocalePath(path, lang, defaultLang?)`

Convert a path to its locale-prefixed version.

```typescript
getLocalePath('/features', 'it');   // → '/it/features'
getLocalePath('/features', 'en');   // → '/features' (no prefix for default)
```

## Publishing

The package is published automatically to GitHub Packages on every push to `main` via the [publish workflow](.github/workflows/publish.yml).

To publish manually:

```bash
# Bump version in package.json, then:
NODE_AUTH_TOKEN=$(gh auth token) npm publish
```

## Development

```bash
git clone git@github.com:puglieseweb-ltd/shared-astro-ui.git
cd shared-astro-ui
```

No build step required — consuming projects (Vite/Astro) import the raw `.astro` and `.ts` source files directly.

To test changes locally in a consuming project, use `pnpm link`:

```bash
# In shared-astro-ui/
pnpm link --global

# In the consuming project (e.g. product-noteble/)
pnpm link --global @puglieseweb-ltd/shared-astro-ui
```
