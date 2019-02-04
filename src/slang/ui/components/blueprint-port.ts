import {PortGroupComponent, PortGroupPosition} from "./port-group";
import {dia, shapes} from "jointjs";
import {PortModel} from "../../model/port";
import {Styles} from "../../../styles/studio";
import {SlangSubject} from "../../custom/events";

export class IsolatedBlueprintPortComponent {

	public static size = {
		width: 100, height: 100
	};

	private readonly portGroup: PortGroupComponent;
	private readonly rectangle: shapes.standard.Rectangle;

	private portMouseEntered = new SlangSubject<{ port: PortModel, x: number, y: number }>("mouseentered");
	private portMouseLeft = new SlangSubject<{ port: PortModel, x: number, y: number }>("mouseleft");

	constructor(name: string, identity: string, port: PortModel, position: PortGroupPosition) {
		this.portGroup = new PortGroupComponent("PortGroup", port, position, 0, 1.0, false);
		const portGroups = {"PortGroup": this.portGroup.getPortGroupElement()};

		const transform = Styles.BlueprintPort.transformations[position];

		this.rectangle = new shapes.standard.Rectangle({
			id: identity,
			size: IsolatedBlueprintPortComponent.size,
			attrs: {
				root: {
					class: "joint-cell joint-element sl-blueprint-port",
				},
				body: {
					fill: "none",
					stroke: "none",
				},
				label: {
					class: "sl-label",
					text: name,
					transform: transform,
				},
			},
			ports: {
				groups: portGroups,
			}
		} as any);

		const parentPort = port;
		this.rectangle.on("port:mouseover",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const port = parentPort.findNodeById(portId);
				if (port) {
					this.portMouseEntered.next({port: port as PortModel, x, y});
				}
			});
		this.rectangle.on("port:mouseout",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const port = parentPort.findNodeById(portId);
				if (port) {
					this.portMouseLeft.next({port: port as PortModel, x, y});
				}
			});

		this.portGroup.setParent(this.rectangle, true);
		this.refresh();
	}

	public getShape(): dia.Element {
		return this.rectangle;
	}

	public refresh(): void {
		this.portGroup.refreshPorts(true);
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