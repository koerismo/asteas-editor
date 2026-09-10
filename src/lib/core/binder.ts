interface BinderFn {
	(): void;
	add<O extends keyof HTMLElementEventMap>(
		on: O,
		call: (event: HTMLElementEventMap[O]) => void,
	): this;
}

export default function Binder(element: EventTarget) {
	const boundList: [string, (...args: any[]) => void][] = [];

	const unbindFn = function () {
		for (const [k, v] of boundList) element.removeEventListener(k, v);
		boundList.length = 0;
	} as BinderFn;

	unbindFn.add = function (on, call) {
		element.addEventListener(on, call as EventListener);
		boundList.push([on, call]);
		return this;
	};

	return unbindFn;
}

export function bound<T extends keyof HTMLElementEventMap>(element: EventTarget, on: T, call: (event: HTMLElementEventMap[T]) => void): () => void {
	element.addEventListener(on, call as EventListener);
	return () => element.removeEventListener(on, call as EventListener);
}
