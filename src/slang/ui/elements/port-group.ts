import {dia, g} from "jointjs";

import {Styles} from "../../../styles/studio";
import {PortModel} from "../../core/abstract/port";
import {TypeIdentifier} from "../../definitions/type";

import {PortElement} from "./port";

export type PortGroupPosition = "top" | "right" | "bottom" | "left";

/* isStreamSub: port is a sub of a stream --> is primitive port is direct child of a stream, it will be visualized accordingly */
function createPortItems(parent: PortGroupComponent, position: PortGroupPosition, port: PortModel, createGhostPorts: boolean, isBlackBox: boolean): PortElement[] {
	const portItems: PortElement[] = [];
	switch (port.getTypeIdentifier()) {
		case TypeIdentifier.Map:
			for (const sub of port.getMapSubs()) {
				portItems.push.apply(portItems, createPortItems(parent, position, sub, createGhostPorts, isBlackBox));
			}
			break;

		case TypeIdentifier.Stream:
			const streamSub = port.getStreamSub()
			portItems.push.apply(portItems, createPortItems(parent, position, streamSub, createGhostPorts, isBlackBox));
			break;

		case TypeIdentifier.Unspecified:
			break;
			// don't display ports of type unspecified
			if (port.isSubport()) {
				portItems.push(new PortElement(port, parent, false, isBlackBox));
			}
			break;

		default:
			portItems.push(new PortElement(port, parent, false, isBlackBox));
	}

	if (createGhostPorts && port.isGenericLike() &&
		(port.getTypeIdentifier() === TypeIdentifier.Map || port.getTypeIdentifier() === TypeIdentifier.Unspecified)) {
		portItems.push(new PortElement(port, parent, true, isBlackBox));
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

	public static layoutFunction(portComponents: PortElement[], position: PortGroupPosition, offset: number, space: number, isBlackBox: boolean): (ports: any[], elBBox: g.Rect, opt: any) => g.Point[] {
		return (ports: PortElement[], elBBox: g.Rect): g.Point[] => {
			return ports.map((_port: PortElement, index: number) => {
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
				const translate = (isBlackBox ? Styles.BlackBox : Styles.Outer).translatePort[portModel.getDirection()];

				switch (position) {
					case "top":
						portPosition = {x: positionAbs, y: translate};
						break;
					case "bottom":
						portPosition = {x: positionAbs, y: elBBox.height + translate};
						break;
					case "left":
						portPosition = {x: translate, y: positionAbs};
						break;
					case "right":
						portPosition = {x: elBBox.width + translate, y: positionAbs};
						break;
				}

				portComponents[index].setPosition(portPosition);
				return new g.Point(portPosition);
			});
		};
	}

	private readonly ports: PortElement[] = [];
	private parentElement: dia.Element | null = null;
	private portGroupElement: dia.Element.PortGroup = {};

	constructor(
		private readonly name: string,
		public readonly port: PortModel,
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

	public setParent(parent: dia.Element, createGhostPorts: boolean) {
		this.parentElement = parent;
		this.refreshPorts(createGhostPorts);
	}

	public refreshPorts(createGhostPorts: boolean) {
		const parentElement = this.parentElement;
		if (!parentElement) {
			throw new Error(`need parent`);
		}

		parentElement.removePorts(this.ports.map((port) => port.shape));

		const ports = createPortItems(this, this.getGroupPosition(), this.port, createGhostPorts, this.isBlackBox);

		this.ports.length = 0;
		this.ports.push.apply(this.ports, ports);

		parentElement.addPorts(this.ports.map((port) => port.shape));
	}

	public refreshPort(port: PortModel) {
		const parentElement = this.parentElement;
		if (!parentElement) {
			throw new Error(`need parent`);
		}

		const pe = this.ports.find((p) => port === p.getModel())!
		pe.refresh()
		parentElement.portProp(port.getIdentity(), "markup", pe.shape.markup)
	}

}
