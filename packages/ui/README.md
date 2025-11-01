# @seatkit/ui

UI component library and design system for SeatKit, built on [shadcn/ui](https://ui.shadcn.com/) with custom restaurant-focused components.

## Overview

This package provides a comprehensive set of React components with:

- **Design Tokens**: Consistent colors, spacing, typography via Tailwind CSS
- **Liquid Glass Effect**: Apple-inspired glass morphism with interactive animations
- **Accessibility**: WCAG 2.1 AA compliant components
- **Type Safety**: Full TypeScript support with strict types
- **Dark Mode**: Built-in dark mode support
- **Customization**: Easily themeable via CSS variables
- **Restaurant Context**: Domain-specific components for reservation management

## Installation

```bash
# Install the package (from workspace root)
pnpm add @seatkit/ui
```

## Usage

### Importing Styles

Import the base styles in your application entry point:

```tsx
import '@seatkit/ui/styles';
```

### Using Utilities

```tsx
import { cn, formatStatus, getStatusColor } from '@seatkit/ui';

// Combine classes with proper Tailwind precedence
const className = cn('px-2 py-1', 'px-4'); // => 'py-1 px-4'

// Format reservation status
const statusText = formatStatus('confirmed'); // => 'Confirmed'

// Get status color classes
const colorClasses = getStatusColor('confirmed'); // => 'bg-status-confirmed text-white'
```

### Using Components

#### GlassContainer - Liquid Glass Effect

Apply Apple's liquid glass effect to any component:

```tsx
import { GlassContainer } from '@seatkit/ui';

// Basic usage with default card variant
<GlassContainer>
  <h2>Reservation Details</h2>
  <p>Party of 4 at 7:00 PM</p>
</GlassContainer>

// Button variant
<GlassContainer variant="button" onClick={handleClick}>
  Confirm Reservation
</GlassContainer>

// Disable glass effect when needed
<GlassContainer glass={false}>
  <p>Regular container without effect</p>
</GlassContainer>

// Custom glass properties
<GlassContainer
  displacementScale={150}
  blurAmount={0.8}
  elasticity={0.3}
  cornerRadius={16}
>
  <div>Highly customized glass effect</div>
</GlassContainer>
```

**Variants:**
- `card` (default): General purpose container
- `button`: Inline flex for button-like elements
- `modal`: Positioned container for modals
- `sidebar`: Full height for sidebars

**Browser Compatibility:**
- Full effect: Chrome/Edge
- Partial effect: Safari/Firefox (no edge refraction)

The effect gracefully degrades on unsupported browsers while maintaining full functionality.

#### Coming Soon

```tsx
// PR 3: Core UI Primitives
import { Button, Card } from '@seatkit/ui';

// PR 5: Domain-specific components
import { ReservationCard, StatusBadge } from '@seatkit/ui';
```

## Design Tokens

### Colors

The design system uses HSL color values for easy theming:

**Status Colors** (Restaurant-specific):
- `confirmed`: Green - Reservation confirmed
- `pending`: Amber - Awaiting confirmation
- `seated`: Blue - Currently seated
- `completed`: Slate - Service completed
- `cancelled`: Red - Reservation cancelled
- `no-show`: Gray - Customer didn't arrive

**Semantic Colors**:
- `primary`: Main brand color
- `secondary`: Supporting brand color
- `destructive`: Error/danger states
- `muted`: Subdued backgrounds and text
- `accent`: Highlight color
- `border`: Component borders
- `input`: Form input borders
- `ring`: Focus rings

### Dark Mode

Dark mode is enabled via the `dark` class on any parent element:

```tsx
<div className="dark">
  {/* All child components will use dark mode */}
</div>
```

### Typography

Font sizes follow a consistent scale:
- `xs`: 0.75rem / 12px
- `sm`: 0.875rem / 14px
- `base`: 1rem / 16px
- `lg`: 1.125rem / 18px
- `xl`: 1.25rem / 20px
- `2xl`: 1.5rem / 24px
- `3xl`: 1.875rem / 30px
- `4xl`: 2.25rem / 36px

### Spacing

Standard Tailwind spacing scale plus restaurant-specific additions:
- `18`: 4.5rem (72px) - Table spacing
- `72`: 18rem (288px) - Layout sections
- `84`: 21rem (336px) - Large containers
- `96`: 24rem (384px) - Maximum width

### Border Radius

Consistent rounding via CSS variables:
- `sm`: Small radius (4px)
- `md`: Medium radius (6px)
- `lg`: Large radius (8px)

## Development

### Building

```bash
pnpm build
```

This will:
1. Compile TypeScript with `tsup`
2. Generate type declarations
3. Process Tailwind CSS

### Testing

```bash
pnpm test          # Run tests once
pnpm test:watch    # Run tests in watch mode
```

### Linting

```bash
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix issues
```

### Type Checking

```bash
pnpm typecheck           # Check types once
pnpm typecheck:watch     # Watch mode
```

## Architecture

```
packages/ui/
├── src/
│   ├── components/        # React components (coming in PR 2-5)
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── styles.css        # Base Tailwind styles
│   └── index.ts          # Main exports
├── tailwind.config.ts    # Design tokens
├── tsup.config.ts        # Build configuration
└── vitest.config.ts      # Test configuration
```

## Roadmap

### ✅ PR 1: Foundation
- Package structure
- Tailwind configuration with design tokens
- Utility functions
- Build tooling

### ✅ PR 2: Glass Effect (Current)
- **GlassContainer** component with liquid glass effect
- React testing setup (jsdom, testing-library)
- Comprehensive component tests

### 🔄 PR 3: Core UI Primitives
- Button component
- Card component
- Typography components

### 🔄 PR 3: Form Components
- Input, Label, Textarea
- Select component
- Form utilities

### 🔄 PR 4: Date/Time Components
- Calendar component
- Date picker
- Time picker

### 🔄 PR 5: Domain-Specific Components
- Reservation card
- Status badge
- Category label

## Contributing

This package follows the SeatKit development standards:

- **Type Safety**: Strict TypeScript with runtime validation
- **Testing**: Comprehensive unit tests for all components
- **Accessibility**: WCAG 2.1 AA compliance
- **Documentation**: Clear examples and API documentation

## License

Apache-2.0
