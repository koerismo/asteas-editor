import { makeSubscriber } from './reactive.js';

export interface HistoryAction<T> {
	readonly type: T;
	/** If true, this action MUST restore absolute state! */
	readonly fastMerge: boolean;
	undo: () => void;
	redo: () => void;
}

/** Represents a series of actions that should be executed in a single step of the file history. */
export class HistoryActionGroup<T> {
	items: HistoryAction<T>[] = [];

	add(action: HistoryAction<T>) {
		const prev = this.items.length && this.items[this.items.length - 1];
		if (action.fastMerge && prev && prev.fastMerge && prev.type === action.type) {
			// TODO: Precautionary context binding. Is this necessary?
			prev.redo = () => action.redo();
			// console.info('Merging with quick method!');
		} else {
			this.items.push(Object.assign({}, action));
			// console.warn('Merging with slow method!');
		}
	}

	undo() {
		for (let i = this.items.length - 1; i >= 0; i--)
			this.items[i].undo();
	}

	redo() {
		for (let i = 0; i < this.items.length; i++)
			this.items[i].redo();
	}
}

export class History<T = string> {
	protected _history: HistoryActionGroup<T>[] = [];
	protected _working_group: HistoryActionGroup<T> = new HistoryActionGroup();
	protected _pos: number = 0;

	protected _undoRedoEffect = makeSubscriber();

	canUndo() {
		this._undoRedoEffect.use();
		return this._pos > 0;
	}
	
	canRedo() {
		this._undoRedoEffect.use();
		return this._pos < this._history.length;
	}

	/**
	 * Adds an item to the history stack.
	 * If merge is true, this item's `redo` will replace the previous item if its type matches.
	 */
	add<V extends HistoryAction<T> & { run?: true }>(item: V): V {
		this._working_group.add(item);
		if (item.run === true) item.redo();
		return item;
	}

	clear() {
		this._pos = 0;
		this._history.length = 0;
		this._working_group = new HistoryActionGroup();
	}

	commit() {
		if (!this._working_group.items.length) return;

		this._pos ++;
		this._history.length = this._pos;
		this._history[this._pos - 1] = this._working_group;

		this._working_group = new HistoryActionGroup();
		this._undoRedoEffect.update();
	}

	undo() {
		if (this._pos <= 0) return;
		this._pos --;
		this._history[this._pos].undo();
		this._undoRedoEffect.update();
	}

	redo() {
		if (this._pos >= this._history.length) return;
		this._history[this._pos].redo();
		this._pos ++;
		this._undoRedoEffect.update();
	}
}
