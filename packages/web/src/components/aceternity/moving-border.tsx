'use client';

import { motion } from 'motion/react';
import React, { useRef } from 'react';

import { cn } from '../../lib/utils.js';

type MovingBorderProps = Readonly<{
	children: React.ReactNode;
	duration?: number;
	rx?: string;
	ry?: string;
	className?: string;
	containerClassName?: string;
	borderClassName?: string;
	as?: React.ElementType;
}>;

export function MovingBorder({
	children,
	duration = 2000,
	rx = '30%',
	ry = '30%',
	className,
	containerClassName,
	borderClassName,
	as: Component = 'div',
}: MovingBorderProps) {
	const pathRef = useRef<SVGRectElement>(null);

	return (
		<Component
			className={cn(
				'relative h-full w-full overflow-hidden bg-transparent p-[1px]',
				containerClassName,
			)}
		>
			<div className="absolute inset-0" style={{ borderRadius: 'inherit' }}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					preserveAspectRatio="none"
					className="absolute h-full w-full"
					width="100%"
					height="100%"
				>
					<rect
						fill="none"
						width="100%"
						height="100%"
						rx={rx}
						ry={ry}
						ref={pathRef}
					/>
				</svg>
				<motion.div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						display: 'inline-block',
						transformOrigin: '0% 0%',
					}}
					animate={{
						offsetDistance: ['0%', '100%'],
					}}
					transition={{
						duration: duration / 1000,
						repeat: Infinity,
						ease: 'linear',
					}}
					className={cn(
						'h-5 w-5 opacity-[0.8]',
						'bg-[radial-gradient(hsl(var(--primary))_40%,transparent_60%)]',
						borderClassName,
					)}
					// Use offset-path to follow the rect border
					// This creates the moving border effect
				/>
			</div>
			<div
				className={cn(
					'relative z-10 h-full w-full rounded-[inherit] bg-background',
					className,
				)}
			>
				{children}
			</div>
		</Component>
	);
}
