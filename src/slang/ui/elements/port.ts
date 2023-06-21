import {attributes, dia, g} from "jointjs";
import { TypeIdentifier } from "../../../slang/definitions/type";

import {Styles} from "../../../styles/studio";
import {PortModel} from "../../core/abstract/port";
import {tid2css} from "../utils";

import {PortGroupComponent, PortGroupPosition} from "./port-group";

/**
 * Component representing a Slang port.
 */

export function getTrianglePortShape(width: number, height: number): string {
	// reduce with and height of port because every port gets a 2px outer edge
	width -= 3
	height -= 2
	return `<path class="CSSCLASS" d="M ${-width / 2} ${-height / 2} L ${width / 2} ${-height / 2} L 0 ${height / 2} z" />`;
}

function getRoundPortShape(width: number, height: number): string {
	// reduce with and height of port because every port gets a 2px outer edge
	return `<circle class="CSSCLASS" cx="${-width/2}" cy="${-height/2}" r="${width}" />`
}

export class PortElement {

	// STATIC:

	private static readonly triangleShape = getTrianglePortShape(Styles.Port.width, Styles.Port.height)
	private static readonly roundShape = getRoundPortShape(2, 2)

	private static getPortMarkup(port: PortModel, ghost: boolean): string {
		const streamDepth = 0; // TODO
		if (streamDepth < 0) {
			throw new Error(`stream depth cannot be negative`);
		}
		let markup = ``;
		for (let i = 0; i < streamDepth + 1; i++) {
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
			markup += (port.isConnected() ? PortElement.triangleShape : PortElement.roundShape).replace("CSSCLASS", classes.join(" "))
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
	public readonly shape: dia.Element.Port = {};

	constructor(private readonly port: PortModel, private readonly parent: PortGroupComponent, readonly ghost: boolean, isBlackBox: boolean) {
		if (ghost) {
			this.shape.id = `${port.getIdentity()}.*`;
		} else {
			this.shape.id = `${port.getIdentity()}`;
		}
		this.shape.group = parent.getName();

		this.shape.markup = PortElement.getPortMarkup(port, ghost);
		this.shape.attrs = {
			path: PortElement.getPortAttributes(parent.getGroupPosition(), port, isBlackBox),
			g: {
				magnet: true,
			},
		};

	}

	public refresh() {
		this.shape.markup = PortElement.getPortMarkup(this.port, this.ghost);
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
