import {DiaCanvasElement} from "../components/base";

export type TargetableComponent = DiaCanvasElement;

export interface UserEvent {
	xy: {x:  number, y: number}

	target?: TargetableComponent

	left: {
		click?: MouseEvent,
		dbclick?: MouseEvent,
	},
	right: {
		click?: MouseEvent
		dbclick?: MouseEvent,
	},
}

export namespace UserEvents {
	interface MouseEventArgs {
		target?: TargetableComponent,
		xy: {x: number, y: number}

		event: MouseEvent,
	}

	export function mouseLeftClick({event, target, xy}: MouseEventArgs): UserEvent {
		return {
			xy,
			target,
			left: {
				click: event
			},
			right: {}
		}
	}

	export function mouseLeftDbclick({event, target, xy}: MouseEventArgs): UserEvent {
		return {
			xy,
			target,
			left: {
				dbclick: event
			},
			right: {}
		}
	}

	export function mouseRightClick({event, target, xy}: MouseEventArgs): UserEvent {
		return {
			xy,
			target,
			left: {},
			right: {
				click: event
			}
		};
	}

	export function pointerClick(args: MouseEventArgs): UserEvent {
		return mouseLeftClick(args)
	}

	export function pointerDbclick(args: MouseEventArgs): UserEvent {
		return mouseLeftDbclick(args)
	}

	export function contextmenu(args: MouseEventArgs): UserEvent {
		return mouseRightClick(args)
	}
}
