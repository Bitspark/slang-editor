import {dia, g} from "jointjs";

import {Styles} from "../../../styles/studio";
import {PortModel} from "../../core/abstract/port";
import {TypeIdentifier} from "../../definitions/type";

import {PortComponent} from "./port";

export type PortGroupPosition = "top" | "right" | "bottom" | "left";

function createPortItems(parent: PortGroupComponent, position: PortGroupPosition, port: PortModel, createGhostPorts: boolean, isBlackBox: boolean): PortComponent[] {
	const portItems: PortComponent[] = [];

	switch (port.getTypeIdentifier()) {
		case TypeIdentifier.Map:
			for (const sub of port.getMapSubs()) {
				portItems.push.apply(portItems, createPortItems(parent, position, sub, createGhostPorts, isBlackBox));
			}
			break;

		case TypeIdentifier.Stream:
			portItems.push.apply(portItems, createPortItems(parent, position, port.getStreamSub(), createGhostPorts, isBlackBox));
			break;

		case TypeIdentifier.Unspecified:
			break;

		default:
			portItems.push(new PortComponent(port, parent, false, isBlackBox));
	}

	if (createGhostPorts && port.isGenericLike() &&
		port.getTypeIdentifier() === TypeIdentifier.Map ||
		port.getTypeIdentifier() === TypeIdentifier.Unspecified) {
		portItems.push(new PortComponent(port, parent, true, isBlackBox));
	}

	return portItems;
}

/**
 * A component for which there is no directly corresponding Slang model.
 * It can be thought of a component that represents a port which has no parent port but is the topmost ports.
 * Currently these are main in- and out-ports and delegate in- and out-ports.
 */
export class PortGroupComponent {

	// STATIC:

	public static layoutFunction(portComponents: PortComponent[], position: PortGroupPosition, offset: number, space: number, isBlackBox: boolean): (ports: any[], elBBox: g.Rect, opt: any) => g.Point[] {
		return (ports: PortComponent[], elBBox: g.Rect): g.Point[] => {
			return ports.map((_port: PortComponent, index: number) => {
				const count = ports.length;

				let total = 0;
				switch (position) {
					case "top":
					case "bottom":
						total = elBBox.width;
						break;
					case "left":
					case "right":
						total = elBBox.height;
						break;
				}

				const lengthAbs = (count - 1) * Styles.PortGroup.portSpacing;
				const spaceAbs = space * total;
				const offsetAbs = offset * total;
				const positionAbs =
					offsetAbs +
					index * Styles.PortGroup.portSpacing +
					(spaceAbs - lengthAbs) / 2;

				let portPosition: g.PlainPoint = {x: 0, y: 0};

				const portModel = portComponents[index].getModel();
				const translate = portModel.isDirectionIn() ? Styles.PortGroup.translationIn : Styles.PortGroup.translationOut;
				const factor = isBlackBox ? 1 : -1;

				switch (position) {
					case "top":
						portPosition = {x: positionAbs, y: -factor * translate};
						break;
					case "bottom":
						portPosition = {x: positionAbs, y: elBBox.height + factor * translate};
						break;
					case "left":
						portPosition = {x: factor * translate, y: positionAbs};
						break;
					case "right":
						portPosition = {x: elBBox.width - factor * translate, y: positionAbs};
						break;
				}

				portComponents[index].setPosition(portPosition);
				return new g.Point(portPosition);
			});
		};
	}

	private readonly ports: PortComponent[] = [];
	private parentElement: dia.Element | null = null;
	private portGroupElement: dia.Element.PortGroup = {};

	constructor(
		private readonly name: string,
		private readonly port: PortModel,
		private readonly groupPosition: PortGroupPosition,
		start: number,
		width: number,
		private isBlackBox: boolean) {
		switch (groupPosition) {
			case "top":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "top", start, width, isBlackBox) as any;
				break;
			case "right":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "right", start, width, isBlackBox) as any;
				break;
			case "bottom":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "bottom", start, width, isBlackBox) as any;
				break;
			case "left":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "left", start, width, isBlackBox) as any;
				break;
		}
	}

	public getPortGroupElement(): dia.Element.PortGroup {
		return this.portGroupElement;
	}

	public getName(): string {
		return this.name;
	}

	public getGroupPosition(): PortGroupPosition {
		return this.groupPosition;
	}

	public setParent(parent: dia.Element, ghostPorts: boolean) {
		this.parentElement = parent;
		this.refreshPorts(ghostPorts);
	}

	public refreshPorts(ghostPorts: boolean) {
		const parentElement = this.parentElement;
		if (!parentElement) {
			throw new Error(`need parent`);
		}

		parentElement.removePorts(this.ports.map((port) => port.getPortElement()));

		const ports = createPortItems(this, this.getGroupPosition(), this.port, ghostPorts, this.isBlackBox);

		this.ports.length = 0;
		this.ports.push.apply(this.ports, ports);

		parentElement.addPorts(this.ports.map((port) => port.getPortElement()));
	}

}
