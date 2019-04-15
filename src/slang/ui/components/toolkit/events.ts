export interface MithrilEvent {
	redraw: boolean;
	currentTarget: any;
}

export interface MithrilMouseEvent extends MouseEvent {
	redraw: boolean;
	path: HTMLElement[];
}

export interface MithrilKeyboardEvent extends KeyboardEvent {
	redraw: boolean;
}

export enum Keypress {
	Enter,
	Up,
	Down,
}
