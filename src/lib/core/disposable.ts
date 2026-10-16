
export type DisposeCall = () => void;
export class Disposable {
	#disposed: boolean = false;
	get disposed(): boolean { return this.#disposed }

	disposables: DisposeCall[] = [];
	dispose() {
		if (this.#disposed)
			throw Error('Attempted to dispose twice!');
		this.#disposed = true;
		this.disposables.forEach(d => { d(); });
		this.disposables.length = 0;
	}
}

export interface CancelToken {
	canceled: boolean;
}
