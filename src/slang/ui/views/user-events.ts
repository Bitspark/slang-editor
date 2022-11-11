import { OperatorBoxComponent } from "../components/blackbox";
import { ConnectionComponent } from "../components/connection";
import { WhiteBoxComponent } from "../components/whitebox";

export type TargetableComponent = OperatorBoxComponent | WhiteBoxComponent | ConnectionComponent;

export interface UserEvent {
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
	export function mouseLeftClick(event: MouseEvent, target?: TargetableComponent): UserEvent {
		return pointerClick(event, target);
	}

	export function mouseLeftDbclick(event: MouseEvent, target?: TargetableComponent): UserEvent {
		return pointerClick(event, target);
	}

	export function mouseRightClick(event: MouseEvent, target?: TargetableComponent): UserEvent {
		return contextmenu(event, target);
	}

	export function pointerClick(event: MouseEvent, target?: TargetableComponent): UserEvent {
		return {
			target,
			left: {
				click: event
			},
			right: {}
		}
	}

	export function pointerDbclick(event: MouseEvent, target?: TargetableComponent): UserEvent {
		return {
			target,
			left: {
				dbclick: event
			},
			right: {}
		}
	}

	export function contextmenu(event: MouseEvent, target?: TargetableComponent): UserEvent {
		return {
			target,
			left: {},
			right: {
				click: event
			}
		};
	}
}
