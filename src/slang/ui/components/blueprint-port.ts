import {dia, shapes} from "jointjs";
import {Styles} from "../../../styles/studio";
import {PortModel} from "../../model/port";
import {PortGroupComponent, PortGroupPosition} from "./port-group";

export class IsolatedBlueprintPortComponent {

	public static size = {
		width: 100, height: 100,
	};

	private readonly portGroup: PortGroupComponent;
	private readonly rectangle: shapes.standard.Rectangle;

	constructor(name: string, identity: string, port: PortModel, position: PortGroupPosition) {
		this.portGroup = new PortGroupComponent("PortGroup", port, position, 0, 1, false);
		const portGroups = {PortGroup: this.portGroup.getPortGroupElement()};

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
					transform,
				},
			},
			ports: {
				groups: portGroups,
			},
		} as any);

		this.portGroup.setParent(this.rectangle, true);
		this.refresh();
	}

	public getShape(): dia.Element {
		return this.rectangle;
	}

	public refresh(): void {
		this.portGroup.refreshPorts(true);
	}
}
