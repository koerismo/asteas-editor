
export type DisposeCall = () => void;
export class Disposable {
	disposables: DisposeCall[] = [];
	dispose() {
		this.disposables.forEach(d => d());
		this.disposables.length = 0;
	}
}
