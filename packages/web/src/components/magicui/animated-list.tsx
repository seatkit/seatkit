'use client';

import { AnimatePresence, motion } from 'motion/react';
import React, { useMemo } from 'react';

import { cn } from '../../lib/utils.js';

type AnimatedListProps = Readonly<{
	children: React.ReactNode;
	className?: string;
	/** Maximum number of items to animate with stagger. Items beyond this get instant animation. */
	maxStagger?: number;
	/** Whether to use reduced motion (fade only, no y offset) */
	reducedMotion?: boolean;
}>;

export function AnimatedList({
	children,
	className,
	maxStagger = 8,
	reducedMotion = false,
}: AnimatedListProps) {
	const childArray = useMemo(
		() => React.Children.toArray(children),
		[children],
	);

	return (
		<div className={cn('flex flex-col', className)}>
			<AnimatePresence mode="popLayout">
				{childArray.map((child, index) => (
					<AnimatedListItem
						key={(child as React.ReactElement).key ?? index}
						index={index}
						maxStagger={maxStagger}
						reducedMotion={reducedMotion}
					>
						{child}
					</AnimatedListItem>
				))}
			</AnimatePresence>
		</div>
	);
}

type AnimatedListItemProps = Readonly<{
	children: React.ReactNode;
	index: number;
	maxStagger: number;
	reducedMotion: boolean;
}>;

function AnimatedListItem({ children, index, maxStagger, reducedMotion }: AnimatedListItemProps) {
	const shouldStagger = index < maxStagger;

	return (
		<motion.div
			initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0 }}
			transition={
				reducedMotion
					? { duration: 0.15 }
					: {
							duration: 0.15,
							delay: shouldStagger ? index * 0.03 : 0,
						}
			}
			layout
		>
			{children}
		</motion.div>
	);
}
