import { cva, type VariantProps } from 'class-variance-authority';
// eslint-disable-next-line @typescript-eslint/naming-convention
import LiquidGlassComponent from 'liquid-glass-react';
import { type CSSProperties, type FC, forwardRef, type ReactNode, type RefObject } from 'react';

import { cn } from '../lib/utils.js';

// Type assertion to work around React 19 compatibility
const LiquidGlass = LiquidGlassComponent as unknown as FC<{
	children: ReactNode;
	className?: string | undefined;
	style?: CSSProperties | undefined;
	displacementScale?: number | undefined;
	blurAmount?: number | undefined;
	saturation?: number | undefined;
	aberrationIntensity?: number | undefined;
	elasticity?: number | undefined;
	cornerRadius?: number | undefined;
	padding?: string | undefined;
	overLight?: boolean | undefined;
	onClick?: (() => void) | undefined;
	mouseContainer?: RefObject<HTMLElement> | undefined;
	mode?: 'standard' | 'polar' | 'prominent' | 'shader' | undefined;
	globalMousePos?: { x: number; y: number } | undefined;
	mouseOffset?: { x: number; y: number } | undefined;
}>;

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

export type GlassContainerProps = {
	/** Content to be rendered inside the glass container */
	children: ReactNode;

	/** Additional CSS classes */
	className?: string;

	/** Inline styles */
	style?: CSSProperties;

	/** Intensity of displacement effect (default: 100) */
	displacementScale?: number;

	/** Frosting level (default: 0.5) */
	blurAmount?: number;

	/** Color saturation intensity (default: 140) */
	saturation?: number;

	/** Chromatic aberration strength (default: 2) */
	aberrationIntensity?: number;

	/** Liquid elasticity feel - 0 is rigid, higher is more elastic (default: 0.2) */
	elasticity?: number;

	/** Border radius in pixels (default: 32) */
	cornerRadius?: number;

	/** CSS padding value */
	padding?: string;

	/** For light backgrounds (default: false) */
	overLight?: boolean;

	/** Click handler */
	onClick?: () => void;

	/** Track mouse in larger area */
	mouseContainer?: RefObject<HTMLElement>;

	/** Refraction mode: standard, polar, prominent, shader (default: standard) */
	mode?: 'standard' | 'polar' | 'prominent' | 'shader';

	/** Manual mouse position control */
	globalMousePos?: { x: number; y: number };

	/** Position offset tuning */
	mouseOffset?: { x: number; y: number };

	/** Disable glass effect (renders children without glass) */
	glass?: boolean;
} & VariantProps<typeof glassVariants>;

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
		// If glass is disabled, render children in a regular div
		if (!glass) {
			return (
				<div className={cn(glassVariants({ variant }), className)} style={style} onClick={onClick}>
					{children}
				</div>
			);
		}

		return (
			<LiquidGlass
				className={cn(glassVariants({ variant }), className)}
				style={style}
				displacementScale={displacementScale}
				blurAmount={blurAmount}
				saturation={saturation}
				aberrationIntensity={aberrationIntensity}
				elasticity={elasticity}
				cornerRadius={cornerRadius}
				padding={padding}
				overLight={overLight}
				onClick={onClick}
				mouseContainer={mouseContainer}
				mode={mode}
				globalMousePos={globalMousePos}
				mouseOffset={mouseOffset}
			>
				{children}
			</LiquidGlass>
		);
	}
);

GlassContainer.displayName = 'GlassContainer';