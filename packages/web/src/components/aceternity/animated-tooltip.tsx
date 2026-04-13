'use client';

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import React, { useState } from 'react';

import { cn } from '../../lib/utils.js';

type AnimatedTooltipItem = Readonly<{
	id: number | string;
	name: string;
	designation?: string;
}>;

type AnimatedTooltipProps = Readonly<{
	items: AnimatedTooltipItem[];
	className?: string;
	/** Delay in ms before showing tooltip on hover */
	hoverDelay?: number;
}>;

export function AnimatedTooltip({ items, className, hoverDelay = 400 }: AnimatedTooltipProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | string | null>(null);
	const [delayedHover, setDelayedHover] = useState<number | string | null>(null);
	const springConfig = { stiffness: 100, damping: 10 };
	const x = useMotionValue(0);
	const rotate = useSpring(useTransform(x, [-100, 100], [-15, 15]), springConfig);
	const translateX = useSpring(useTransform(x, [-100, 100], [-25, 25]), springConfig);

	const handleMouseEnter = (id: number | string) => {
		setHoveredIndex(id);
		const timer = setTimeout(() => {
			setDelayedHover(id);
		}, hoverDelay);
		return () => clearTimeout(timer);
	};

	const handleMouseLeave = () => {
		setHoveredIndex(null);
		setDelayedHover(null);
	};

	const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
		const halfWidth = event.currentTarget.offsetWidth / 2;
		x.set(event.nativeEvent.offsetX - halfWidth);
	};

	return (
		<div className={cn('flex flex-row items-center', className)}>
			{items.map((item) => (
				<div
					key={item.id}
					className="relative -mr-2 group"
					onMouseEnter={() => handleMouseEnter(item.id)}
					onMouseLeave={handleMouseLeave}
					onMouseMove={handleMouseMove}
				>
					<AnimatePresence mode="popLayout">
						{hoveredIndex === item.id && delayedHover === item.id && (
							<motion.div
								initial={{ opacity: 0, y: 10, scale: 0.9 }}
								animate={{
									opacity: 1,
									y: 0,
									scale: 1,
									transition: {
										type: 'spring',
										stiffness: 260,
										damping: 20,
									},
								}}
								exit={{ opacity: 0, y: 10, scale: 0.9 }}
								style={{
									translateX,
									rotate,
									whiteSpace: 'nowrap',
								}}
								className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center rounded-md bg-foreground z-50 shadow-xl px-3 py-1.5"
							>
								{/* Arrow */}
								<div className="absolute inset-x-0 z-30 -bottom-px h-px w-[40%] mx-auto bg-gradient-to-r from-transparent via-primary to-transparent" />
								<div className="absolute left-1/2 -translate-x-1/2 -bottom-px w-[40%] z-30 h-px bg-gradient-to-r from-transparent via-ring to-transparent" />
								<p className="text-background text-xs font-bold relative z-30">
									{item.name}
								</p>
								{item.designation && (
									<p className="text-background/80 text-xs">
										{item.designation}
									</p>
								)}
							</motion.div>
						)}
					</AnimatePresence>
					<div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer">
						{item.name.charAt(0).toUpperCase()}
					</div>
				</div>
			))}
		</div>
	);
}
