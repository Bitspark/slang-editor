import {ConnectionElement} from "../elements/connection";
import {OperatorBox} from "../elements/operator";
import {BlueprintBox} from "../elements/blueprint";
import {BlueprintPortElement} from "../elements/blueprint-port";
import {DiaCanvasElement} from "../elements/base";

export type InteractableDiaElement = ConnectionElement | OperatorBox | BlueprintBox | BlueprintPortElement

export interface UserEvent {
	xy: {x:  number, y: number}

	target?: DiaCanvasElement

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
		target?: DiaCanvasElement,
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
