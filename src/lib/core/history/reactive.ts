import { createSubscriber } from 'svelte/reactivity';
import { effect_tracking } from 'svelte/internal/client';

/**
 * Wraps subscribers to be reactive.
 * @param v The initial value.
 */
export function makeSubscriber(): { use(): void, update(): void } {
	let update: (() => void) | undefined;

	const sub = createSubscriber(fn => {
		update = fn;
		return () => update = undefined;
	});

	return {
		use() {
			if (effect_tracking()) sub();
		},
		update() {
			update?.();
		},
	}
}

/**
 * Wraps a value with a getter/setter to be compatible with svelte reactivity.
 * @param initial The initial value.
 */
export function makeReactive<T>(initial: T): { set(v: T): void, get(): T } {
	let update: (() => void) | undefined;
	let value: T = initial;

	const sub = createSubscriber(fn => {
		update = fn;
		return () => update = undefined;
	});

	return {
		get() {
			if ($effect.tracking()) sub();
			return value;
		},
		set(v: T) {
			value = v;
			update?.();
		},
	}
}
