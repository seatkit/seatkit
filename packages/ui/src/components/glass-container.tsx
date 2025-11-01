import { cva, type VariantProps } from 'class-variance-authority';
// eslint-disable-next-line @typescript-eslint/naming-convention
import LiquidGlassComponent from 'liquid-glass-react';
import { type CSSProperties, type FC, forwardRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';

import { cn } from '../lib/utils.js';

type LiquidGlassPropsBase = {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
	displacementScale?: number;
	blurAmount?: number;
	saturation?: number;
	aberrationIntensity?: number;
	elasticity?: number;
	cornerRadius?: number;
	padding?: string;
	overLight?: boolean;
	onClick?: () => void;
	mouseContainer?: RefObject<HTMLElement>;
	mode?: 'standard' | 'polar' | 'prominent' | 'shader';
	globalMousePos?: { x: number; y: number };
	mouseOffset?: { x: number; y: number };
};

// Type assertion to work around React 19 compatibility
const LiquidGlass = LiquidGlassComponent as unknown as FC<LiquidGlassPropsBase>;

const glassVariants = cva('', {
	variants: {
		variant: {
			card: '',
			button: 'inline-flex items-center justify-center',
			modal: 'relative',
			sidebar: 'h-full',
		},
	},
	defaultVariants: {
		variant: 'card',
	},
});

export type GlassContainerProps = Omit<LiquidGlassPropsBase, 'children'> & {
	/** Content to be rendered inside the glass container */
	children: ReactNode;

	/** Disable glass effect (renders children without glass) */
	glass?: boolean;
} & VariantProps<typeof glassVariants>;

/**
 * Helper to conditionally include props when value is defined
 */
const conditionalProp = <T,>(value: T | undefined, propName: string): Record<string, T> | Record<string, never> =>
	value !== undefined ? { [propName]: value } : {};

/**
 * Keyboard handler for interactive elements
 */
const handleKeyboardInteraction = (onClick: (() => void) | undefined) => (e: KeyboardEvent<HTMLDivElement>) => {
	if (onClick && (e.key === 'Enter' || e.key === ' ')) {
		e.preventDefault();
		onClick();
	}
};

/**
 * GlassContainer - A wrapper component that applies Apple's liquid glass effect
 *
 * Uses the liquid-glass-react library with sensible defaults optimized for restaurant UI.
 * The effect includes interactive frosted glass with refraction, displacement, and elastic
 * animations that respond to mouse movement.
 *
 * **Browser Compatibility:**
 * - Full effect: Chrome/Edge
 * - Partial effect: Safari/Firefox (no edge refraction)
 *
 * @example
 * ```tsx
 * // Basic usage with default card variant
 * <GlassContainer>
 *   <h2>Reservation Details</h2>
 *   <p>Party of 4 at 7:00 PM</p>
 * </GlassContainer>
 *
 * // Button variant
 * <GlassContainer variant="button" onClick={handleClick}>
 *   Confirm Reservation
 * </GlassContainer>
 *
 * // Disable glass effect
 * <GlassContainer glass={false}>
 *   <p>Regular container without glass effect</p>
 * </GlassContainer>
 * ```
 */
export const GlassContainer = forwardRef<HTMLDivElement, GlassContainerProps>(
	({
		children,
		className,
		style,
		variant = 'card',
		displacementScale = 100,
		blurAmount = 0.5,
		saturation = 140,
		aberrationIntensity = 2,
		elasticity = 0.2,
		cornerRadius = 32,
		padding,
		overLight = false,
		onClick,
		mouseContainer,
		mode = 'standard',
		globalMousePos,
		mouseOffset,
		glass = true,
	}) => {
		const baseClassName = cn(glassVariants({ variant }), className);
		const interactiveProps = onClick
			? {
					onClick,
					onKeyDown: handleKeyboardInteraction(onClick),
					role: 'button' as const,
					tabIndex: 0,
				}
			: {};

		// If glass is disabled, render children in a regular div
		if (!glass) {
			return (
				<div className={baseClassName} style={style} {...interactiveProps}>
					{children}
				</div>
			);
		}

		return (
			<LiquidGlass
				className={baseClassName}
				{...conditionalProp(style, 'style')}
				displacementScale={displacementScale}
				blurAmount={blurAmount}
				saturation={saturation}
				aberrationIntensity={aberrationIntensity}
				elasticity={elasticity}
				cornerRadius={cornerRadius}
				{...conditionalProp(padding, 'padding')}
				overLight={overLight}
				{...conditionalProp(onClick, 'onClick')}
				{...conditionalProp(mouseContainer, 'mouseContainer')}
				mode={mode}
				{...conditionalProp(globalMousePos, 'globalMousePos')}
				{...conditionalProp(mouseOffset, 'mouseOffset')}
			>
				{children}
			</LiquidGlass>
		);
	}
);

GlassContainer.displayName = 'GlassContainer';