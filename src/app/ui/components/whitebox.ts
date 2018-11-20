import m from "mithril";
import {AttachedComponent, Component} from "./base";
import {Styles} from "../../../styles/studio";
import {BlackBox} from "../../custom/nodes";
import {dia, g, layout, shapes} from "jointjs";
import {BlueprintInstance, BlueprintModel} from "../../model/blueprint";
import {BlackBoxComponent, OperatorBoxComponent} from "./blackbox";
import {ClassComponent, CVnode} from "mithril";
import {PaperView} from "../views/paper-view";
import {ConnectionComponent} from "./connection";
import {BlueprintPortModel, GenericPortModel} from "../../model/port";
import {PortGroupPosition} from "./port-group";
import {IsolatedBlueprintPortComponent} from "./blueprint-port";
import {Connection} from "../../custom/connections";
import {OperatorModel} from "../../model/operator";
import {BlueprintDelegateModel} from "../../model/delegate";
import {Form} from "./mithril/form";

export class WhiteBoxComponent extends Component {
	private static readonly padding = 120;
	private static readonly minimumSpace = 10;

	private readonly shape: WhiteBoxComponent.Shape;
	private readonly buttons: AttachedComponent;

	private readonly operators: Array<BlackBoxComponent> = [];
	private readonly connections: Array<ConnectionComponent> = [];
	private readonly ports = {
		top: [] as Array<dia.Element>,
		bottom: [] as Array<dia.Element>,
		left: [] as Array<dia.Element>,
		right: [] as Array<dia.Element>,
	};

	constructor(paperView: PaperView, private readonly blueprint: BlueprintModel) {
		super(paperView, {x: 0, y: 0,});
		this.buttons = this.createComponent({x: 0, y: 0, alignment: "br"});
		this.subscribe();

		const size = {
			width: WhiteBoxComponent.padding * 2 + WhiteBoxComponent.minimumSpace,
			height: WhiteBoxComponent.padding * 2 + WhiteBoxComponent.minimumSpace,
		};
		this.shape = new WhiteBoxComponent.Shape(this.blueprint, size);
		this.shape.addTo(this.graph);
		this.autoLayout();
	}

	private subscribe() {
		this.blueprint.subscribeDeployed((instance: BlueprintInstance | null) => {
			if (!instance) {
				this.buttons.mount({
					view: () => m(WhiteBoxComponent.Tool.Button, {
						onClick: () => {
							this.blueprint.requestDeployment();
						},
						label: "Deploy",
						icon: "D",
						class: "dply",
					})
				});
			} else {
				this.buttons.mount({
					view: () => m(".toolbox", [
						m(WhiteBoxComponent.Tool.Button, {
							onClick: () => {
								window.open(instance.url, "_blank");
							},
							label: "Running",
							icon: "X",
							class: "running",
						}),
						m(WhiteBoxComponent.Tool.Button, {
							onClick: () => {
								this.blueprint.requestShutdown();
							},
							label: "",
							icon: "S",
							class: "stop",
						}),
					])
				});
			}
		});

		this.blueprint.subscribeChildCreated(OperatorModel, operator => {
			this.addOperator(operator);
			this.fitOuter(true);
		});

		this.blueprint.subscribeChildCreated(BlueprintPortModel, port => {
			if (port.isDirectionIn()) {
				const p = this.createIsolatedPort(port, `${this.blueprint.getIdentity()}_in`, `${this.blueprint.getShortName()} In-Port`, "top");
				this.buttons.attachTo(p.getElement());
			} else {
				this.createIsolatedPort(port, `${this.blueprint.getIdentity()}_out`, `${this.blueprint.getShortName()} Out-Port`, "bottom");
			}
		});

		this.blueprint.subscribeChildCreated(BlueprintDelegateModel, delegate => {
			delegate.subscribeChildCreated(BlueprintPortModel, port => {
				if (port.isDirectionIn()) {
					this.createIsolatedPort(port, `${delegate.getIdentity()}_in`, `Delegate ${delegate.getName()} In-Port`, "right");
				} else {
					this.createIsolatedPort(port, `${delegate.getIdentity()}_out`, `Delegate ${delegate.getName()} Out-Port`, "right");
				}
			});
		});

		this.blueprint.subscribeDescendantCreated(GenericPortModel, port => {
			if (!port.isSource()) {
				return;
			}
			port.subscribeConnected(connection => {
				this.addConnection(connection);
			});
			port.subscribeDisconnected(connection => {
				this.removeConnection(connection);
			});
		});
	}

	public autoLayout() {
		const operatorRectangles = this.operators.map(operatorComponent => operatorComponent.getRectangle());
		const connectionLinks = this.connections.map(connectionComponent => connectionComponent.getLink());

		layout.DirectedGraph.layout(
			[...operatorRectangles, ...connectionLinks, ...this.ports.top, ...this.ports.bottom, ...this.ports.left, ...this.ports.right,], {
				nodeSep: 120,
				rankSep: 120,
				edgeSep: 0,
				rankDir: "TB",
				resizeClusters: false,
			});

		const boundingBox = this.graph.getCellsBBox(operatorRectangles) || new g.Rect({
			x: 0,
			y: 0,
			width: WhiteBoxComponent.minimumSpace,
			height: WhiteBoxComponent.minimumSpace,
		});

		this.operators.forEach(operator => {
			operator.translate(-(boundingBox.x + boundingBox.width / 2), -(boundingBox.y + boundingBox.height / 2));
		});

		boundingBox.x -= boundingBox.x + boundingBox.width / 2;
		boundingBox.y -= boundingBox.y + boundingBox.height / 2;

		// Center ports

		const padding = WhiteBoxComponent.padding;

		for (const port of this.ports.top) {
			port.set({
				position: {
					x: boundingBox.x - 50 + boundingBox.width / 2,
					y: boundingBox.y - 100 - padding,
				}
			});
		}

		for (const port of this.ports.bottom) {
			port.set({
				position: {
					x: boundingBox.x - 50 + boundingBox.width / 2,
					y: boundingBox.y + boundingBox.height + padding,
				}
			});
		}

		const offset = boundingBox.y + (boundingBox.height - this.ports.right.length * 100) / 2;
		this.ports.right.forEach((port, index) => {
			port.set({
				position: {
					x: boundingBox.x + boundingBox.width + padding,
					y: offset + index * 100,
				}
			});
		});

		this.fitOuter(false);
	}

	public fitOuter(animation: boolean) {
		if (!this.shape) {
			return;
		}

		const padding = WhiteBoxComponent.padding;
		const currentPosition = this.shape.get("position");
		const currentSize = this.shape.get("size");

		let newX: number = currentPosition.x + padding;
		let newY: number = currentPosition.y + padding;
		let newCornerX: number = currentPosition.x + currentSize.width - 2 * padding;
		let newCornerY: number = currentPosition.y + currentSize.height - 2 * padding;

		this.operators.forEach(operator => {
			const childBBox = operator.getBBox();
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

		if (!!set.position || !!set.size) {
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

			for (const port of this.ports.top) {
				const currentPortPosition = port.get("position");
				const targetPosition = {
					x: currentPortPosition.x,
					y: newPosition.y - 100,
				};
				if (!animation) {
					port.set({position: targetPosition});
				} else {
					port.transition("position/x", targetPosition.x);
					port.transition("position/y", targetPosition.y);
				}
			}

			for (const port of this.ports.bottom) {
				const currentPortPosition = port.get("position");
				const targetPosition = {
					x: currentPortPosition.x,
					y: newPosition.y + newSize.height,
				};
				if (!animation) {
					port.set({position: targetPosition});
				} else {
					port.transition("position/x", targetPosition.x);
					port.transition("position/y", targetPosition.y);
				}
			}

			this.ports.right.forEach(port => {
				const currentPortPosition = port.get("position");
				const targetPosition = {
					x: newPosition.x + newSize.width,
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
	}

	private createIsolatedPort(port: BlueprintPortModel, id: string, name: string, position: PortGroupPosition): IsolatedBlueprintPortComponent {
		const invertedPosition: { [key in PortGroupPosition]: PortGroupPosition } = {
			top: "bottom",
			bottom: "top",
			left: "right",
			right: "left",
		};

		const that = this;
		const portComponent = new IsolatedBlueprintPortComponent(this.graph, name, id, port, invertedPosition[position]);
		const portElement = portComponent.getElement();

		let calculateRestrictedRect: (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => g.PlainRect;

		const elementSize = portElement.get("size") as g.PlainRect;

		switch (position) {
			case "top":
				portElement.set({position: {x: -elementSize.width / 2, y: 0}});
				this.ports.top.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y - elementSize.height,
					width: outerSize.width,
					height: elementSize.height
				});
				break;
			case "bottom":
				portElement.set({position: {x: -elementSize.width / 2, y: 0}});
				this.ports.bottom.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y + outerSize.height,
					width: outerSize.width,
					height: elementSize.height
				});
				break;
			case "left":
				portElement.set({position: {x: 0, y: -elementSize.height / 2}});
				this.ports.left.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x - elementSize.width,
					y: outerPosition.y,
					width: elementSize.width,
					height: outerSize.height
				});
				break;
			case "right":
				portElement.set({position: {x: 0, y: -elementSize.height / 2}});
				this.ports.right.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x + outerSize.width,
					y: outerPosition.y,
					width: elementSize.width,
					height: outerSize.height
				});
				break;
		}

		portElement.set("restrictTranslate", function (): g.PlainRect {
			const outerPosition = that.shape.get("position") as g.PlainPoint;
			const outerSize = that.shape.get("size") as g.PlainRect;
			return calculateRestrictedRect(outerPosition, outerSize);
		});

		return portComponent;
	}

	private addConnection(connection: Connection) {
		this.connections.push(new ConnectionComponent(this.graph, connection));
	}

	private addOperator(operator: OperatorModel) {
		this.operators.push(new OperatorBoxComponent(this.graph, operator));
	}

	private removeConnection(connection: Connection) {
		const linkId = ConnectionComponent.getLinkId(connection);
		const link = ConnectionComponent.findLink(this.graph, connection);
		if (link) {
			link.remove();
		} else {
			throw new Error(`link with id ${linkId} not found`);
		}
		const idx = this.connections.findIndex(conn => conn.getId() === linkId);
		if (idx !== -1) {
			this.connections.splice(idx, 1);
		} else {
			throw new Error(`connection with id ${linkId} not found`);
		}
	}

}

export namespace WhiteBoxComponent {
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

	function constructRectAttrs({id, cssClass, size}: BasicAttrs): dia.Element.GenericAttributes<RectangleSelectors> {
		const {width, height} = size;
		const position = {x: -width / 2, y: -height / 2};

		return {
			id,
			position,
			size,
			z: -2,
			attrs: {
				root: {
					class: "joint-cell joint-element sl-blackbox",
				},
			},
		};
	}

	export class Shape extends shapes.standard.Rectangle.define("WhiteBox", Styles.Defaults.Outer) {
		constructor(blackBox: BlackBox, size: Size) {
			super(constructRectAttrs({
				id: `${blackBox.getIdentity()}_outer`,
				size,
			}) as any);
			this.attr("draggable", false);
			this.set("obstacle", false);
		}
	}

	export namespace Tool {
		export interface Attrs {
			onClick: () => void
			label: string
			icon: string
			class: string
		}

		export class Button implements ClassComponent<Attrs> {
			private alreadyClicked: boolean = false;
			private bounceInterval = 500;

			oninit({attrs}: CVnode<Attrs>) {
			}

			view({attrs}: CVnode<Attrs>) {
				return m("a.btn.sl-tool-btn", {
						class: attrs.class,
						onclick: () => {
							if (!this.alreadyClicked) {
								this.alreadyClicked = true;
								attrs.onClick();
								const that = this;
								setTimeout(() => {
									that.alreadyClicked = false;
								}, this.bounceInterval);
							}
						},
						tooltip: attrs.label,
					},
					attrs.icon);
			}
		}
	}
}
