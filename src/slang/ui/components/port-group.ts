import {PortComponent} from "./port";
import {dia, g} from "jointjs";
import {PortModel} from "../../model/port";
import {TypeIdentifier} from "../../custom/type";
import {Styles} from "../../../styles/studio";
import {OperatorModel} from "../../model/operator";

export type PortGroupPosition = "top" | "right" | "bottom" | "left";

function createPortItems(parent: PortGroupComponent, position: PortGroupPosition, port: PortModel, createGhostPorts: boolean): Array<PortComponent> {
	let portItems: Array<PortComponent> = [];

	switch (port.getTypeIdentifier()) {
		case TypeIdentifier.Map:
			if (port.isCollapsed()) {
				portItems.push(new PortComponent(port, parent, false));
				break;
			}
			for (const sub of port.getMapSubs()) {
				portItems.push.apply(portItems, createPortItems(parent, position, sub, createGhostPorts));
			}
			break;

		case TypeIdentifier.Stream:
			portItems.push.apply(portItems, createPortItems(parent, position, port.getStreamSub(), createGhostPorts));
			break;

		// case TypeIdentifier.Generic:
		// 	portItems.push(new PortComponent(port, parent, false));
		// 	break;

		default:
			portItems.push(new PortComponent(port, parent, false));
	}

	// if (createGhostPorts && port.getGenericIdentifier()) {
	// 	portItems.push(new PortComponent(port, parent, true));
	// }

	return portItems;
}

/**
 * A component for which there is no directly corresponding Slang model.
 * It can be thought of a component that represents a port which has no parent port but is the topmost ports.
 * Currently these are main in- and out-ports and delegate in- and out-ports.
 */
export class PortGroupComponent {

	private readonly ports: Array<PortComponent> = [];
	private parentElement: dia.Element | null = null;
	private portGroupElement: dia.Element.PortGroup = {};

	constructor(
		private readonly name: string,
		private readonly port: PortModel,
		private readonly groupPosition: PortGroupPosition,
		start: number,
		width: number) {
		switch (groupPosition) {
			case "top":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "top", start, width) as any;
				break;
			case "right":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "right", start, width) as any;
				break;
			case "bottom":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "bottom", start, width) as any;
				break;
			case "left":
				this.portGroupElement.position = PortGroupComponent.layoutFunction(this.ports, "left", start, width) as any;
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

	public setParent(parent: dia.Element, drawGenerics: boolean) {
		this.parentElement = parent;
		this.refreshPorts(drawGenerics);
	}

	public refreshPorts(drawGenerics: boolean) {
		const parentElement = this.parentElement;
		if (!parentElement) {
			throw new Error(`need parent`);
		}
		
		parentElement.removePorts(this.ports.map(port => port.getPortElement()));

		const ports = createPortItems(this, this.getGroupPosition(), this.port, drawGenerics);
		
		this.ports.length = 0;
		this.ports.push.apply(this.ports, ports);
		
		parentElement.addPorts(this.ports.map(port => port.getPortElement()));
	}

	// STATIC:

	public static layoutFunction(portComponents: Array<PortComponent>, position: PortGroupPosition, offset: number, space: number): (ports: Array<any>, elBBox: g.Rect, opt: any) => Array<g.Point> {
		return function (ports: Array<PortComponent>, elBBox: g.Rect): Array<g.Point> {
			return ports.map((_port: PortComponent, index: number, ports: Array<any>) => {
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
				const portOwner = portModel.getOwner();
				const translate = portModel.isDirectionIn() ? Styles.PortGroup.TranslationIn : Styles.PortGroup.TranslationOut;
				const factor = portOwner instanceof OperatorModel ? 1 : -1;

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

}