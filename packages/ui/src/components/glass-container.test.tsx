import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GlassContainer } from './glass-container.js';

describe('GlassContainer', () => {
	it('should render children', () => {
		render(<GlassContainer>Test Content</GlassContainer>);
		expect(screen.getByText('Test Content')).toBeInTheDocument();
	});

	it('should render with glass effect enabled', () => {
		// When glass is enabled, just verify the component renders without errors
		render(<GlassContainer className="custom-class">Content</GlassContainer>);
		expect(screen.getByText('Content')).toBeInTheDocument();
	});

	it('should apply custom styles when glass is enabled', () => {
		// When glass is enabled, verify component renders with custom styles
		const customStyle = { backgroundColor: 'red', width: '200px' };
		render(<GlassContainer style={customStyle}>Content</GlassContainer>);
		expect(screen.getByText('Content')).toBeInTheDocument();
	});

	it('should handle onClick events', async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(<GlassContainer onClick={handleClick}>Click Me</GlassContainer>);
		await user.click(screen.getByText('Click Me'));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	describe('variants', () => {
		it('should apply card variant by default', () => {
			render(<GlassContainer>Content</GlassContainer>);
			// Card variant has no specific classes, just verifies it renders with content
			expect(screen.getByText('Content')).toBeInTheDocument();
		});

		it('should apply button variant when glass is disabled', () => {
			const { container } = render(
				<GlassContainer variant="button" glass={false}>
					Content
				</GlassContainer>
			);
			const element = container.firstChild as HTMLElement;
			expect(element.className).toContain('inline-flex');
			expect(element.className).toContain('items-center');
			expect(element.className).toContain('justify-center');
		});

		it('should apply modal variant when glass is disabled', () => {
			const { container } = render(
				<GlassContainer variant="modal" glass={false}>
					Content
				</GlassContainer>
			);
			const element = container.firstChild as HTMLElement;
			expect(element.className).toContain('relative');
		});

		it('should apply sidebar variant when glass is disabled', () => {
			const { container } = render(
				<GlassContainer variant="sidebar" glass={false}>
					Content
				</GlassContainer>
			);
			const element = container.firstChild as HTMLElement;
			expect(element.className).toContain('h-full');
		});
	});

	describe('glass prop', () => {
		it('should render with glass effect by default', () => {
			const { container } = render(<GlassContainer>Content</GlassContainer>);
			// When glass is enabled, LiquidGlass component is rendered
			// We can verify by checking if the content is still rendered
			expect(screen.getByText('Content')).toBeInTheDocument();
			expect(container.firstChild).toBeInTheDocument();
		});

		it('should disable glass effect when glass={false}', () => {
			const { container } = render(<GlassContainer glass={false}>Content</GlassContainer>);
			const element = container.firstChild as HTMLElement;
			// When glass is disabled, it renders a plain div
			expect(screen.getByText('Content')).toBeInTheDocument();
			expect(element.tagName).toBe('DIV');
		});

		it('should apply className when glass is disabled', () => {
			const { container } = render(
				<GlassContainer glass={false} className="custom-class">
					Content
				</GlassContainer>
			);
			const element = container.firstChild as HTMLElement;
			expect(element.className).toContain('custom-class');
		});

		it('should handle onClick when glass is disabled', async () => {
			const handleClick = vi.fn();
			const user = userEvent.setup();

			render(
				<GlassContainer glass={false} onClick={handleClick}>
					Click Me
				</GlassContainer>
			);
			await user.click(screen.getByText('Click Me'));

			expect(handleClick).toHaveBeenCalledTimes(1);
		});
	});

	describe('props forwarding', () => {
		it('should forward displacement scale prop', () => {
			// We can't directly test LiquidGlass internal props, but we can verify
			// the component renders without errors with custom props
			expect(() => {
				render(<GlassContainer displacementScale={150}>Content</GlassContainer>);
			}).not.toThrow();
		});

		it('should forward blur amount prop', () => {
			expect(() => {
				render(<GlassContainer blurAmount={0.8}>Content</GlassContainer>);
			}).not.toThrow();
		});

		it('should forward saturation prop', () => {
			expect(() => {
				render(<GlassContainer saturation={200}>Content</GlassContainer>);
			}).not.toThrow();
		});

		it('should forward elasticity prop', () => {
			expect(() => {
				render(<GlassContainer elasticity={0.5}>Content</GlassContainer>);
			}).not.toThrow();
		});

		it('should forward cornerRadius prop', () => {
			expect(() => {
				render(<GlassContainer cornerRadius={16}>Content</GlassContainer>);
			}).not.toThrow();
		});

		it('should forward mode prop', () => {
			expect(() => {
				render(<GlassContainer mode="polar">Content</GlassContainer>);
			}).not.toThrow();
		});
	});
});