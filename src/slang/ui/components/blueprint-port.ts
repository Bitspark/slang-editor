import {dia, shapes} from "jointjs";

import {Styles} from "../../../styles/studio";
import {PortModel} from "../../core/abstract/port";
import {SlangSubject} from "../../core/abstract/utils/events";

import {PortGroupComponent, PortGroupPosition} from "./port-group";

export class BlueprintPortElement {

	public static size = {
		width: 100, height: 100,
	};

	private readonly portGroup: PortGroupComponent;
	private readonly rectangle: shapes.standard.Rectangle;

	private portMouseEntered = new SlangSubject<{ port: PortModel, x: number, y: number }>("mouseentered");
	private portMouseLeft = new SlangSubject<{ port: PortModel, x: number, y: number }>("mouseleft");

	constructor(id: string, port: PortModel, position: PortGroupPosition, private createGhostPorts: boolean) {
		this.portGroup = new PortGroupComponent("PortGroup", port, position, 0, 1, false);
		const portGroups = {PortGroup: this.portGroup.getPortGroupElement()};

		const transform = Styles.BlueprintPort.transformations[position];

		this.rectangle = new shapes.standard.Rectangle({
			id,
			size: BlueprintPortElement.size,
			attrs: {
				root: {
					class: "joint-cell joint-element sl-blueprint-port",
				},
				body: {
					fill: "none",
					stroke: "none",
				},
				label: {
					transform,
					class: "sl-label",
				},
			},
			ports: {
				groups: portGroups,
			},
		} as any);

		this.rectangle.on("port:mouseover",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const childPort = port.findNodeById(portId);
				if (childPort) {
					this.portMouseEntered.next({x, y, port: childPort as PortModel});
				}
			});
		this.rectangle.on("port:mouseout",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const childPort = port.findNodeById(portId);
				if (childPort) {
					this.portMouseLeft.next({x, y, port: childPort as PortModel});
				}
			});

		this.portGroup.setParent(this.rectangle, this.createGhostPorts);
		this.refresh();
	}

	public getShape(): dia.Element {
		return this.rectangle;
	}

	public refresh(): void {
		this.portGroup.refreshPorts(this.createGhostPorts);
	}

	public onPortMouseEnter(cb: (port: PortModel, x: number, y: number) => void) {
		this.portMouseEntered.subscribe(({port, x, y}) => {
			cb(port, x, y);
		});
	}

	public onPortMouseLeave(cb: (port: PortModel, x: number, y: number) => void) {
		this.portMouseLeft.subscribe(({port, x, y}) => {
			cb(port, x, y);
		});
	}
}
