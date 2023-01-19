import {dia, g, layout, shapes} from "jointjs";
import m, {ClassComponent, CVnode} from "mithril";

import {Styles} from "../../../styles/studio";
import {GenericPortModel, PortModel} from "../../core/abstract/port";
import {Connection} from "../../core/abstract/utils/connections";
import {SlangSubject} from "../../core/abstract/utils/events";
import {BlueprintModel} from "../../core/models";
import {BlueprintDelegateModel} from "../../core/models";
import {OperatorModel} from "../../core/models";
import {BlueprintPortModel} from "../../core/models";
import {TypeIdentifier} from "../../definitions/type";
import {tid2css} from "../utils";
import {Canvas} from "../canvas/base";

import {FloatingHtmlElement, DiaCanvasElement} from "./base";
import {OperatorBox} from "./operator";
import {BlueprintPortElement} from "./blueprint-port";
import {ConnectionElement} from "./connection";
import {PortGroupPosition} from "./port-group";
import {UserEvent} from "../canvas/user-events";

export class BlueprintBox extends DiaCanvasElement {
	private static readonly padding = 60;

	public connectionAdded = new SlangSubject<ConnectionElement>("connection-added");
	public operatorAdded = new SlangSubject<OperatorBox>("operator-added");

	public readonly operators: OperatorBox[] = [];
	public readonly connections: ConnectionElement[] = [];

	protected readonly cssAttr = "root/class";
	protected readonly shape: BlueprintBox.Rect;

	private portMouseEntered = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseentered");
	private portMouseLeft = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseleft");
	private readonly portInfos: FloatingHtmlElement[] = [];

	private readonly ports = {
		top: [] as BlueprintPortElement[],
		bottom: [] as BlueprintPortElement[],
		left: [] as BlueprintPortElement[],
		right: [] as BlueprintPortElement[],
	};

	constructor(paperView: Canvas, public readonly blueprint: BlueprintModel) {
		super(paperView, {x: 0, y: 0});
		this.subscribe();

		this.shape = new BlueprintBox.Rect(this.blueprint);

		this.shape.on("change:size", () => {
			blueprint.size = this.shape.size();
		});

		this.paperView.paper.on("cell:pointerdown", () => {
			this.clearPortInfos();
		});

		this.render();
		this.centerizeOuter();
	}

	public getModel(): BlueprintModel {
		return this.blueprint;
	}

	public getShape(): dia.Element {
		return super.getShape() as dia.Element;
	}

	public autoLayout() {
		const operatorRectangles = this.operators.map((operatorComponent) => operatorComponent.getShape());
		const connectionLinks = this.connections.map((connectionComponent) => connectionComponent.getShape());

		layout.DirectedGraph.layout(
			[
				...operatorRectangles,
				...connectionLinks,
				...this.ports.top.map((p) => p.getShape()),
				...this.ports.bottom.map((p) => p.getShape()),
				...this.ports.left.map((p) => p.getShape()),
				...this.ports.right.map((p) => p.getShape()),
			], {
				nodeSep: 80,
				rankSep: 80,
				edgeSep: 0,
				rankDir: "TB",
				resizeClusters: false,
			});

		this.centerizeOuter();
	}

	public centerizeOuter() {
		const operatorRectangles = this.operators.map((operatorComponent) => operatorComponent.getShape());

		const {width, height} = this.blueprint.size;

		const bbox = this.paperView.getCellsBBox(operatorRectangles) || new g.Rect({
			width,
			height,
			x: -width / 2,
			y: -height / 2,
		});

		bbox.width = Math.max(width, bbox.width);
		bbox.height = Math.max(height, bbox.height);
		const [pWidth, pHeight] = [BlueprintPortElement.size.width, BlueprintPortElement.size.height];

		bbox.x = -bbox.width / 2;
		bbox.y = -bbox.height / 2;

		// Center ports

		for (const port of this.ports.top) {
			port.getShape().set({
				position: {
					x: this.blueprint.inPosition - pWidth / 2,
					y: bbox.y - pHeight,
				},
			});
		}

		for (const port of this.ports.bottom) {
			port.getShape().set({
				position: {
					x: this.blueprint.outPosition - pWidth / 2,
					y: bbox.y + bbox.height,
				},
			});
		}

		this.ports.right.forEach((port) => {
			const portElem = port.getShape();
			const y = portElem.position().y;
			portElem.set({
				position: {
					y,
					x: bbox.x + bbox.width,
				},
			});
		});

		this.fitOuter(false);
	}

	public fitOuter(animation: boolean) {
		if (!this.shape) {
			return;
		}

		const padding = BlueprintBox.padding;
		const currentPosition = this.shape.get("position");
		const currentSize = this.shape.get("size");
		const [, pHeight] = [BlueprintPortElement.size.width, BlueprintPortElement.size.height];

		let newX: number = currentPosition.x + padding;
		let newY: number = currentPosition.y + padding;
		let newCornerX: number = currentPosition.x + currentSize.width - 2 * padding;
		let newCornerY: number = currentPosition.y + currentSize.height - 2 * padding;

		this.operators.forEach((operator) => {
			const childBBox = operator.bbox;
			if (childBBox.x < newX) {
				newX = childBBox.x;
			}
			if (childBBox.y < newY) {
				newY = childBBox.y;
			}
			const corner = childBBox.corner();
			if (corner.x > newCornerX) {
				newCornerX = corner.x;
			}
			if (corner.y > newCornerY) {
				newCornerY = corner.y;
			}
		});

		const set = {
			position: {x: 0, y: 0},
			size: {width: 0, height: 0},
		};

		set.position.x = newX - padding;
		set.position.y = newY - padding;
		set.size.width = newCornerX - newX + 2 * padding;
		set.size.height = newCornerY - newY + 2 * padding;

		let newPosition = {x: currentPosition.x, y: currentPosition.y};
		let newSize = {width: currentPosition.width, height: currentPosition.height};

		if (currentPosition.x <= set.position.x && currentPosition.y <= set.position.y) {
			delete set.position;
		} else {
			if (currentPosition.x <= set.position.x) {
				set.position.x = currentPosition.x;
			} else if (currentPosition.y <= set.position.y) {
				set.position.y = currentPosition.y;
			}
			const deltaX = currentPosition.x - set.position.x;
			const deltaY = currentPosition.y - set.position.y;
			set.size.width = Math.max(set.size.width, currentSize.width + deltaX);
			set.size.height = Math.max(set.size.height, currentSize.height + deltaY);
			newPosition = set.position;
			newSize = set.size;
		}

		if (set.size.width <= currentSize.width && set.size.height <= currentSize.height) {
			delete set.size;
		} else {
			if (set.size.width <= currentSize.width) {
				set.size.width = currentSize.width;
			} else if (set.size.height <= currentSize.height) {
				set.size.height = currentSize.height;
			}
			newSize = set.size;
		}

		if (!set.position && !set.size) {
			return;
		}

		if (!animation) {
			this.shape.set(set);
		} else {
			if (!!set.size) {
				this.shape.transition("size/height", set.size.height);
				this.shape.transition("size/width", set.size.width);
			}
			if (!!set.position) {
				this.shape.transition("position/x", set.position.x);
				this.shape.transition("position/y", set.position.y);
			}
		}

		const outerEdgeSize = 2;

		this.ports.top.map((p) => p.getShape()).forEach((port) => {
			const currentPortPosition = port.get("position");
			const targetPosition = {
				x: currentPortPosition.x,
				y: newPosition.y - pHeight - outerEdgeSize,
			};
			if (!animation) {
				port.set({position: targetPosition});
			} else {
				port.transition("position/x", targetPosition.x);
				port.transition("position/y", targetPosition.y);
			}
		});

		this.ports.bottom.map((p) => p.getShape()).forEach((port) => {
			const currentPortPosition = port.get("position");
			const targetPosition = {
				x: currentPortPosition.x,
				y: newPosition.y + newSize.height - outerEdgeSize,
			};
			if (!animation) {
				port.set({position: targetPosition});
			} else {
				port.transition("position/x", targetPosition.x);
				port.transition("position/y", targetPosition.y);
			}
		});

		this.ports.right.map((p) => p.getShape()).forEach((port) => {
			const currentPortPosition = port.get("position");
			const targetPosition = {
				x: newPosition.x + newSize.width + outerEdgeSize,
				y: currentPortPosition.y,
			};
			if (!animation) {
				port.set({position: targetPosition});
			} else {
				port.transition("position/x", targetPosition.x);
				port.transition("position/y", targetPosition.y);
			}
		});
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

	private subscribe() {
		this.blueprint.subscribeChildCreated(OperatorModel, (operator) => {
			const opComp = this.addOperator(operator);
			this.fitOuter(true);

			operator.subscribeDestroyed(() => {
				const idx = this.operators.indexOf(opComp);
				if (idx < 0) {
					return;
				}

				opComp.destroy();
				this.operators.splice(idx, 1);
				this.fitOuter(true);
			});
		});

		this.blueprint.getFakeGenerics().subscribeGenericsChanged(() => {
			this.ports.top.forEach((p) => {
				p.refresh();
			});
			this.ports.bottom.forEach((p) => {
				p.refresh();
			});
			this.connections.forEach((component) => {
				const connection = component.getConnection();
				if (!connection.source.isConnectedWith(connection.destination)) {
					return;
				}
				if (connection.source.getBlackBox() === this.blueprint || connection.destination.getBlackBox() === this.blueprint) {
					component.refresh();
				}
			});
		});

		this.blueprint.subscribeChildCreated(BlueprintPortModel, (port) => {
			this.createPort(port, this.blueprint, port.isDirectionIn() ? "top" : "bottom");
		});

		this.blueprint.subscribeChildCreated(BlueprintDelegateModel, (delegate) => {
			delegate.subscribeChildCreated(BlueprintPortModel, (port) => {
				if (port.isDirectionIn()) {
					this.createPort(port, delegate, "right");
				} else {
					this.createPort(port, delegate, "right");
				}
			});
		});

		this.blueprint.subscribeDescendantCreated(GenericPortModel, (port) => {
			if (!port.isSource()) {
				return;
			}
			port.subscribeConnected((other) => {
				this.addConnection({source: port, destination: other});
			});
			port.subscribeDisconnected((other) => {
				this.removeConnection({source: port, destination: other});
			});
		});

		const refreshOperatorConnections = (operator: OperatorModel) => {
			this.connections.forEach((component) => {
				const connection = component.getConnection();
				if (!connection.source.isConnectedWith(connection.destination)) {
					return;
				}
				if (connection.source.getBlackBox() === operator || connection.destination.getBlackBox() === operator) {
					component.refresh();
				}
			});
		};

		this.blueprint.subscribeChildCreated(OperatorModel, (operator) => {
			operator.getGenerics().subscribeGenericsChanged(() => {
				refreshOperatorConnections(operator);
			});
			operator.getProperties().subscribeAssignmentChanged(() => {
				refreshOperatorConnections(operator);
			});
		});
	}

	public onUserEvent(cb: (e: UserEvent) => void) {
		console.log("BLUEPRINT BOX, onUserEvent");
		super.onUserEvent(cb)
		Object
			.values(this.ports)
			.reduce((allPorts, sidePorts) => allPorts.concat(sidePorts), [])
			.forEach((port) => {
				port.onUserEvent(cb);
			})
	}

	private createPort(port: BlueprintPortModel, owner: BlueprintModel | BlueprintDelegateModel, pos: PortGroupPosition): BlueprintPortElement {
		const portDir = port.isDirectionIn() ? "in" : "out";
		const offset = port.isDirectionIn() ? owner.inPosition : owner.outPosition;
		const id = `${owner.getIdentity()}_${portDir}`;

		const invertedPosition: { [key in PortGroupPosition]: PortGroupPosition } = {
			top: "bottom",
			bottom: "top",
			left: "right",
			right: "left",
		};

		const portComponent = new BlueprintPortElement(this.paperView, id, port, invertedPosition[pos], this.paperView.isEditable);
		const portElement = portComponent.getShape();
		this.paperView.renderCell(portElement);
		const outerEdgeSize = 2;

		let calculateRestrictedRect: (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => g.PlainRect;
		const elementSize = portElement.get("size") as g.PlainRect;
		switch (pos) {
			case "top":
				this.ports.top.push(portComponent);
				portElement.set({
					position: {
						x: offset - elementSize.width / 2,
						y: -elementSize.height,
					},
				});

				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y - elementSize.height - outerEdgeSize,
					width: outerSize.width,
					height: elementSize.height,
				});

				portElement.on("change:position", () => {
					owner.inPosition = portElement.getBBox().center().x;
				});
				break;

			case "bottom":

				portElement.set({
					position: {
						x: offset - elementSize.width / 2,
						y: 0,
					},
				});

				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y + outerSize.height - outerEdgeSize,
					width: outerSize.width,
					height: elementSize.height,
				});

				portElement.on("change:position", () => {
					owner.outPosition = portElement.getBBox().center().x;
				});
				this.ports.bottom.push(portComponent);
				break;

			case "left":
				this.ports.left.push(portComponent);

				portElement.set({
					position: {
						x: 0,
						y: offset - elementSize.height / 2,
					},
				});

				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x - elementSize.width,
					y: outerPosition.y,
					width: elementSize.width,
					height: outerSize.height,
				});
				break;

			case "right":
				portElement.set({
					position: {
						x: 0,
						y: offset - elementSize.height / 2,
					},
				});
				this.ports.right.push(portComponent);

				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x + outerSize.width,
					y: outerPosition.y,
					width: elementSize.width,
					height: outerSize.height,
				});

				if (port.isDirectionIn()) {
					portElement.on("change:position", () => {
						owner.inPosition = portElement.getBBox().center().y;
					});
				} else {
					portElement.on("change:position", () => {
						owner.outPosition = portElement.getBBox().center().y;
					});
				}
				break;
		}

		portElement.set("restrictTranslate", (): g.PlainRect => {
			const outerPosition = this.shape.get("position") as g.PlainPoint;
			const outerSize = this.shape.get("size") as g.PlainRect;
			return calculateRestrictedRect(outerPosition, outerSize);
		});

		this.attachPortInfo(portComponent);

		return portComponent;
	}

	private addConnection(connection: Connection): ConnectionElement {
		const connComp = new ConnectionElement(this.paperView, connection);
		this.connectionAdded.next(connComp);
		this.connections.push(connComp);
		return connComp;
	}

	private addOperator(opr: OperatorModel): OperatorBox {
		const oprComp = this.paperView.getFactory().createOperatorBox(this.paperView, opr);
		this.attachPortInfo(oprComp);
		this.operatorAdded.next(oprComp);
		this.operators.push(oprComp);
		return oprComp;
	}

	private attachPortInfo(portOwnerComp: OperatorBox | BlueprintPortElement) {
		portOwnerComp.onPortMouseEnter((port: PortModel, x: number, y: number) => {
			// in order to avoid multiple portInfos to be drawn we keep track of them and clear them out if needed
			// since there are so many different events that can and should trigger a dismissal this solution is not
			// really future proof.
			// IMO a better solution would be to keep track of things that can be dismissed and destroy those
			// once a dismissive action is trigger e.g. ESC or point and click to blank
			this.clearPortInfos();
			const portInfo = this
				.createComponent({x, y: y + 2, align: "tl"})
				.mount({
					view: () => m(PortInfo, {port}),
				});
			this.trackPortInfo(portInfo);
		});
		portOwnerComp.onPortMouseLeave(() => {
			this.clearPortInfos();
		});
	}

	private trackPortInfo(portInfo: FloatingHtmlElement) {
		this.portInfos.push(portInfo);
	}

	private clearPortInfos() {
		while (this.portInfos.length > 0) {
			const oldPortInfo = this.portInfos.pop();
			if (oldPortInfo) {
				oldPortInfo.destroy();
			}
		}
	}

	private removeConnection(connection: Connection) {
		const linkId = ConnectionElement.getLinkId(connection);
		const link = ConnectionElement.findLink(this.paperView, connection);
		if (link) {
			link.remove();
		}

		const idx = this.connections.findIndex((conn) => conn.getId() === linkId);
		if (idx !== -1) {
			this.connections.splice(idx, 1);
		}
	}

}

export interface Attrs {
	port: PortModel;
}

class PortInfo implements ClassComponent<Attrs> {
	// Note that class methods cannot infer parameter types
	public oninit() {
		return;
	}

	public view({attrs}: CVnode<Attrs>) {
		const port = attrs.port;
		const tid = port.getTypeIdentifier();

		return m(".sl-port-info",
			m(".sl-port-type", {
					class: tid2css(tid),
				},
				TypeIdentifier[tid]),
			m(".sl-port-name", port.getPortReference()),
		);
	}
}

export namespace BlueprintBox {
	import RectangleSelectors = shapes.standard.RectangleSelectors;

	interface Size {
		width: number;
		height: number;
	}

	interface BasicAttrs {
		id?: string;
		cssClass?: string;
		size: Size;
	}

	function constructRectAttrs({id, size}: BasicAttrs): dia.Element.GenericAttributes<RectangleSelectors> {
		const {width, height} = size;
		const position = {x: -width / 2, y: -height / 2};

		return {
			id,
			position,
			size,
			z: -2,
		};
	}

	export class Rect extends shapes.standard.Rectangle.define("WhiteBox", Styles.Defaults.outer) {
		constructor(blueprint: BlueprintModel) {
			super(constructRectAttrs({
				id: `${blueprint.getIdentity()}_outer`,
				size: blueprint.size,
			}) as any);
			this.attr("draggable", false);
			this.set("obstacle", false);

			if (blueprint.isElementary()) {
				const cssClass = this.attr("root/class");
				this.attr("root/class", `${cssClass} sl-blupr-elem`);
			}
		}
	}
}
