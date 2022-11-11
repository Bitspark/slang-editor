import { SelectableComponent } from "./blueprint";

export interface UserEvent {
	target?: SelectableComponent
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
	export function mouseLeftClick(event: MouseEvent, target?: SelectableComponent): UserEvent {
		return pointerClick(event, target);
	}

	export function mouseLeftDbclick(event: MouseEvent, target?: SelectableComponent): UserEvent {
		return pointerClick(event, target);
	}

	export function mouseRightClick(event: MouseEvent, target?: SelectableComponent): UserEvent {
		return contextmenu(event, target);
	}

	export function pointerClick(event: MouseEvent, target?: SelectableComponent): UserEvent {
		return {
			target,
			left: {
				click: event
			},
			right: {}
		}
	}

	export function pointerDbclick(event: MouseEvent, target?: SelectableComponent): UserEvent {
		return {
			target,
			left: {
				dbclick: event
			},
			right: {}
		}
	}

	export function contextmenu(event: MouseEvent, target?: SelectableComponent): UserEvent {
		return {
			target,
			left: {},
			right: {
				click: event
			}
		};
	}
}
