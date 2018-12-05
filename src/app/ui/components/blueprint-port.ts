import {PortGroupComponent, PortGroupPosition} from "./port-group";
import {dia, shapes} from "jointjs";
import {PortModel} from "../../model/port";
import {Styles} from "../../../styles/studio";

export class IsolatedBlueprintPortComponent {

	private readonly portGroup: PortGroupComponent;
	private readonly rectangle: shapes.standard.Rectangle;

	constructor(private graph: dia.Graph, name: string, identity: string, port: PortModel, position: PortGroupPosition) {
		this.portGroup = new PortGroupComponent(graph, "PortGroup", port, position, 0, 1.0);
		const portGroups = {"PortGroup": this.portGroup.getPortGroupElement()};

		const transform = Styles.BlueprintPort.transformations[position];

		this.rectangle = new shapes.standard.Rectangle({
			id: identity,
			size: {width: 100, height: 100},
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

		this.rectangle.addTo(this.graph);
		
		this.portGroup.setParent(this.rectangle, true);
		this.refresh();
	}

	public getElement(): dia.Element {
		return this.rectangle;
	}
	
	public refresh(): void {
		this.portGroup.refreshPorts(true);
	}

}