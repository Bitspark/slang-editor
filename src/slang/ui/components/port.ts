import {attributes, dia} from "jointjs";
import {Styles} from "../../../styles/studio";
import {PortModel} from "../../core/models/abstract/port";
import {TypeIdentifier} from "../../definitions/type";

export type PortGroupPosition = "top" | "right" | "bottom" | "left";

/**
 * Component representing a Slang port.
 */
export class PortComponent {

	// STATIC:

	private static getPortShape(width: number, height: number): string {
		return `M ${-width / 2} ${-height / 2} ` +
			`L ${width / 2} ${-height / 2} ` +
			`L 0 ${height / 2} z`;
	}

	private static getPortMarkup(port: PortModel): string {
		const streamDepth = port.getStreamDepth();
		if (streamDepth < 0) {
			throw new Error(`stream depth cannot be negative`);
		}
		let markup = ``;
		for (let i = 0; i < streamDepth + 1; i++) {
			const factor = 1 - (i / (streamDepth + 1));
			const width = Styles.Port.width * factor;
			const height = Styles.Port.height * factor;
			const classes = ["sl-port"];
			if (i % 2 === 1) {
				classes.push(`sl-stripe`);
			} else {
				if (port.isGeneric() && port.getTypeIdentifier() === TypeIdentifier.Map) {
					classes.push(`sl-type-generic`);
				} else {
					classes.push(`sl-type-${TypeIdentifier[port.getTypeIdentifier()].toLowerCase()}`);
				}
			}
			markup += `<path class="${classes.join(" ")}" d="${PortComponent.getPortShape(width, height)}"></path>`;
		}
		return `<g>${markup}</g>`;
	}

	private static getPortAttributes(position: PortGroupPosition, port: PortModel): attributes.SVGAttributes {
		const attrs: attributes.SVGAttributes = {
			paintOrder: "stroke fill",
		};

		switch (position) {
			case "top":
				attrs.transform = "";
				break;
			case "right":
				attrs.transform = `rotate(${port.isDirectionIn() ? 90 : -90})`;
				break;
			case "bottom":
				attrs.transform = "";
				break;
			case "left":
				attrs.transform = `rotate(${port.isDirectionIn() ? -90 : 90})`;
				break;
		}

		return attrs;
	}

	private readonly portElement: dia.Element.Port = {};

	constructor(private readonly port: PortModel, groupName: string, groupPosition: PortGroupPosition) {
		if (port.isGeneric()) {
			this.portElement.id = `${port.getIdentity()}.*`;
		} else {
			this.portElement.id = `${port.getIdentity()}`;
		}
		this.portElement.group = groupName;
		this.portElement.markup = PortComponent.getPortMarkup(port);
		this.portElement.attrs = {
			path: PortComponent.getPortAttributes(groupPosition, port),
			g: {
				magnet: true,
			},
		};
	}

	public getPortElement(): dia.Element.Port {
		return this.portElement;
	}

	public getModel(): PortModel {
		return this.port;
	}
}
