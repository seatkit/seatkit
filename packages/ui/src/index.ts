/**
 * @seatkit/ui
 *
 * UI component library and design system for SeatKit
 * Based on shadcn/ui with custom restaurant-focused components
 */

// Export utilities
export { cn, formatStatus, getStatusColor, type PolymorphicComponentProps } from './lib/utils.js';

// Export components
export { GlassContainer, type GlassContainerProps } from './components/glass-container.js';

// Settings components
export { SettingsLayout } from './components/settings/SettingsLayout.js';
export { SettingsNav } from './components/settings/SettingsNav.js';
export { SettingsNavItem } from './components/settings/SettingsNavItem.js';
export { SettingsPage } from './components/settings/SettingsPage.js';
export { ForbiddenBanner } from './components/settings/ForbiddenBanner.js';
export { DestructiveButton } from './components/settings/DestructiveButton.js';
export { ConfirmDialog } from './components/settings/ConfirmDialog.js';

// Note: Additional component exports will be added in future PRs
// export { Button } from './components/button.js';
// export { Card } from './components/card.js';
// etc.
