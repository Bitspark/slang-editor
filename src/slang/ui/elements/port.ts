import {attributes, dia, g} from "jointjs";
import { TypeIdentifier } from "../../../slang/definitions/type";

import {Styles} from "../../../styles/studio";
import {PortModel} from "../../core/abstract/port";
import {tid2css} from "../utils";

import {PortGroupComponent, PortGroupPosition} from "./port-group";

/**
 * Component representing a Slang port.
 */
export class PortElement {

	// STATIC:

	private static getPortShape(width: number, height: number): string {
		// reduce with and height of port because every port gets a 2px outer edge
		width -= 3
		height -= 2

		return `M ${-width / 2} ${-height / 2} ` +
			`L ${width / 2} ${-height / 2} ` +
			`L 0 ${height / 2} z`;
	}

	private static getPortMarkup(port: PortModel, ghost: boolean): string {
		const streamDepth = 0; // TODO
		if (streamDepth < 0) {
			throw new Error(`stream depth cannot be negative`);
		}
		let markup = ``;
		for (let i = 0; i < streamDepth + 1; i++) {
			const factor = 1 - (i / (streamDepth + 1));
			const width = Styles.Port.width * factor;
			const height = Styles.Port.height * factor;
			const classes = ["sl-port"];
			if (i % 2 === 0) {
				if (ghost) {
					classes.push(tid2css("ghost"));
				} else {
					classes.push(tid2css(port.getTypeIdentifier()));
					if (port.isStreamSub()) {
						// this port is a subport of a stream
						classes.push(tid2css(TypeIdentifier.Stream))
					}
				}
			} else {
				classes.push(`sl-stripe`);
			}
			markup += `<path class="${classes.join(" ")}" d="${PortElement.getPortShape(width, height)}"></path>`;
		}
		return `<g>${markup}</g>`;
	}

	private static getPortAttributes(position: PortGroupPosition, port: PortModel, isBlackBox: boolean): attributes.SVGAttributes {
		const attrs: attributes.SVGAttributes = {
			paintOrder: "stroke fill",
		};

		const unchanged = 0;
		const turnAround = 180;
		const turnRight = 90;
		const turnLeft = -90;

		const rotation = isBlackBox ? port.isDirectionIn() : port.isDirectionOut();
		switch (position) {
			case "top":
				attrs.transform = `rotate(${rotation ? unchanged : turnAround})`;
				break;
			case "right":
				attrs.transform = `rotate(${rotation ? turnRight : turnLeft})`;
				break;
			case "bottom":
				attrs.transform = `rotate(${rotation ? turnAround : unchanged})`;
				break;
			case "left":
				attrs.transform = `rotate(${rotation ? turnLeft : turnRight})`;
				break;
		}

		return attrs;
	}

	private position: g.PlainPoint | undefined;
	private readonly portShape: dia.Element.Port = {};

	constructor(private readonly port: PortModel, private readonly parent: PortGroupComponent, readonly ghost: boolean, isBlackBox: boolean) {
		if (ghost) {
			this.portShape.id = `${port.getIdentity()}.*`;
		} else {
			this.portShape.id = `${port.getIdentity()}`;
		}
		this.portShape.group = parent.getName();
		this.portShape.markup = PortElement.getPortMarkup(port, ghost);
		this.portShape.attrs = {
			path: PortElement.getPortAttributes(parent.getGroupPosition(), port, isBlackBox),
			g: {
				magnet: true,
			},
		};
	}

	public getShape(): dia.Element.Port {
		return this.portShape;
	}

	public getModel(): PortModel {
		return this.port;
	}

	public setPosition(position: g.PlainPoint) {
		this.position = position;
	}

	public getPosition(): g.PlainPoint | undefined {
		return this.position;
	}

	public getGroup(): PortGroupComponent {
		return this.parent;
	}
}
