import {dia, shapes} from "jointjs";

import {Styles} from "../../../styles/studio";
import {PortModel} from "../../core/abstract/port";
import {SlangSubject} from "../../core/abstract/utils/events";

import {PortGroupComponent, PortGroupPosition} from "./port-group";
import {DiaCanvasElement} from "./base";
import {Canvas} from "../canvas/base";
import {UserEvents} from "../canvas/user-events";

export class BlueprintPortElement extends DiaCanvasElement {
	protected readonly cssAttr = "root/class";

	public static size = {
		width: 100, height: 100,
	};

	private readonly portGroup: PortGroupComponent;
	protected readonly shape!: shapes.standard.Rectangle;

	private portMouseEntered = new SlangSubject<{ port: PortModel, x: number, y: number }>("mouseentered");
	private portMouseLeft = new SlangSubject<{ port: PortModel, x: number, y: number }>("mouseleft");

	constructor(canvas: Canvas, id: string, port: PortModel, position: PortGroupPosition, private createGhostPorts: boolean) {
		super(canvas, {x: 0, y: 0});
		this.portGroup = new PortGroupComponent("PortGroup", port, position, 0, 1, false);
		const portGroups = {PortGroup: this.portGroup.getPortGroupElement()};

		const transform = Styles.BlueprintPort.transformations[position];

		this.shape = new shapes.standard.Rectangle({
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

		this.shape.on("port:mouseover",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const childPort = port.findNodeById(portId);
				if (childPort) {
					this.portMouseEntered.next({x, y, port: childPort as PortModel});
				}
			});
		this.shape.on("port:mouseout",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const childPort = port.findNodeById(portId);
				if (childPort) {
					this.portMouseLeft.next({x, y, port: childPort as PortModel});
				}
			});

		// @ts-ignore
		this.shape.on("pointerclick",
			(_cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
				console.log("LEFT CLICK")
			this.userInteracted.next(UserEvents.pointerClick({event, xy: {x, y}}));
		});
		// @ts-ignore
		this.shape.on("pointerdblclick",
			(_cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
				console.log("DOUBLE CLICK")
			this.userInteracted.next(UserEvents.pointerDbclick({event, xy: {x, y}}));
		});
		// @ts-ignore
		this.shape.on("contextmenu",
			(_cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
			console.log("RIGHT CLICK")
			this.userInteracted.next(UserEvents.contextmenu({event, xy: {x, y}}));
		});

		this.portGroup.setParent(this.shape, this.createGhostPorts);
		this.refresh();
	}

	public getShape(): dia.Element {
		return this.shape;
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
