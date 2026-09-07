export interface UndoRedoAction {
	type: string;
	timestamp: number;
	redo(): void;
	undo(): void;
}

export class UndoRedo {
	history: UndoRedoAction[] = [];
	position: number = 0;

	mount() {
		const cb = this._onKeyDown.bind(this);
		document.addEventListener('keydown', cb);
		return () => document.removeEventListener('keydown', cb);
	}

	_onKeyDown(event: KeyboardEvent) {
		if (!event.metaKey) return;
		if (event.key !== 'z' && event.key !== 'y') return;
		event.preventDefault();
		event.stopPropagation();

		if (event.key === 'y' || event.shiftKey) {
			this.redo();
		} else {
			this.undo();
		}
	}

	add(entry: Omit<UndoRedoAction, 'timestamp'>) {
		this.position += 1;
		this.history.length = this.position - 1;
		this.history.push({ ...entry, timestamp: Date.now() });
		
		// TODO: TEST THIS CODE
		if (this.history.length > 200) {
			this.history.shift();
			this.position -= 1;
		}

		console.log('ACTION:', entry.type);
	}

	redo() {
		if (this.position >= this.history.length) return;
		this.history[this.position].redo();
		console.log('REDO:', this.history[this.position].type);
		this.position += 1;
	}

	undo() {
		if (this.position <= 0) return;
		this.position -= 1;
		this.history[this.position].undo();
		console.log('UNDO:', this.history[this.position].type);
	}
}
