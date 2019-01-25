import m, {ClassComponent, CVnode} from "mithril";

import {AttachableComponent, CellComponent} from "./base";
import {Styles} from "../../../styles/studio";
import {BlackBox} from "../../custom/nodes";
import {dia, g, layout, shapes} from "jointjs";
import {BlueprintInstance, BlueprintModel} from "../../model/blueprint";
import {BlackBoxComponent, OperatorBoxComponent} from "./blackbox";
import {PaperView} from "../views/paper-view";
import {ConnectionComponent} from "./connection";
import {BlueprintPortModel, GenericPortModel, PortModel} from "../../model/port";
import {PortGroupPosition} from "./port-group";
import {IsolatedBlueprintPortComponent} from "./blueprint-port";
import {Connection} from "../../custom/connections";
import {OperatorModel} from "../../model/operator";
import {BlueprintDelegateModel} from "../../model/delegate";
import {SlangTypeValue, TypeIdentifier} from "../../custom/type";
import {Tk} from "./toolkit";
import Button = Tk.Button;
import {InputConsole, OutputConsole} from "./console";
import {componentFactory} from "./factory";
import {DashboardComponent} from "./dashboard";
import Modal = Tk.Modal;
import {SlangSubject} from "../../custom/events";
import Box = Tk.Box;

export class WhiteBoxComponent extends CellComponent {
	private static readonly padding = 120;
	private static readonly minimumSpace = 10;

	private clicked = new SlangSubject<{ event: MouseEvent, x: number, y: number }>("clicked");
	private dblclicked = new SlangSubject<{ event: MouseEvent, x: number, y: number }>("dblclicked");
	private portMouseEntered = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseentered");
	private portMouseLeft = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseleft");

	protected readonly shape: WhiteBoxComponent.Rect;
	private readonly buttons: AttachableComponent;
	private readonly input: AttachableComponent;
	private readonly output: AttachableComponent;

	private readonly operators: Array<BlackBoxComponent> = [];
	private readonly connections: Array<ConnectionComponent> = [];
	private readonly ports = {
		top: [] as Array<IsolatedBlueprintPortComponent>,
		bottom: [] as Array<IsolatedBlueprintPortComponent>,
		left: [] as Array<IsolatedBlueprintPortComponent>,
		right: [] as Array<IsolatedBlueprintPortComponent>,
	};

	constructor(paperView: PaperView, private readonly blueprint: BlueprintModel) {
		super(paperView, {x: 0, y: 0});
		this.buttons = this.createComponent({x: 0, y: 0, align: "l"});
		this.input = this.createComponent({x: 0, y: 0, align: "b"});
		this.output = this.createComponent({x: 0, y: 0, align: "t"});
		this.subscribe();

		const size = {
			width: WhiteBoxComponent.padding * 2 + WhiteBoxComponent.minimumSpace,
			height: WhiteBoxComponent.padding * 2 + WhiteBoxComponent.minimumSpace,
		};
		this.shape = new WhiteBoxComponent.Rect(this.blueprint, size);

		this.shape.on("pointerclick",
			(cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
				this.clicked.next({event, x, y});
			});
		this.shape.on("pointerdblclick",
			(cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
				this.dblclicked.next({event, x, y});
			});

		this.render();
		this.autoLayout();
	}

	private subscribe() {
		this.blueprint.subscribeDeployed((instance: BlueprintInstance | null) => {
			if (!instance) {
				this.buttons.mount({
					view: () => m(".toolbox", [
						m(Button, {
							onClick: () => {
								this.blueprint.save();
								this.blueprint.requestDeployment();
							},
							class: "sl-blupr-deploy",
						}, "Deploy"),
						m(Button, {
							onClick: () => {
								this.blueprint.save();
							},
							class: "sl-blupr-deploy",
						}, "Save"),
					])
				});
				this.input.unmount();
				this.output.unmount();

			} else {
				this.buttons.mount({
					view: () => m(".toolbox", [
						m(Button, {
							class: "sl-green-pulsing",
						}, "Running"),
						m(Button, {
							onClick: () => {
								this.blueprint.requestShutdown();
							},
							class: "sl-btn-warn",
						}, "Shutdown"),
					])
				});

				const portIn = this.blueprint.getPortIn();

				if (portIn) {
					this.input.mount({
						view: () => m(Box, m(InputConsole, {
							onSubmit: (values: SlangTypeValue) => {
								this.blueprint.pushInput(values);
							},
							type: portIn.getType()
						}))
					});
				}

				const portOut = this.blueprint.getPortOut();

				if (portOut) {
					const outputValues: Array<SlangTypeValue> = [];

					this.blueprint.subscribeOutputPushed((outputData: SlangTypeValue) => {
						outputValues.unshift(outputData);
						m.redraw();
					}, this.blueprint.shutdownRequested);

					this.output.mount({
						view: () => m(Box, m(OutputConsole, {
							onLoad: () => {
								return outputValues;
							},
							type: portOut.getType()
						}))
					});
				}
			}
		});

		this.blueprint.subscribeChildCreated(OperatorModel, operator => {
			const opComp = this.addOperator(operator);
			this.fitOuter(true);

			operator.subscribeDestroyed(() => {
				const idx = this.operators.indexOf(opComp);
				if (idx >= 0) {
					opComp.destroy();
					this.operators.splice(idx, 1);
					this.fitOuter(true);
				}
			});
		});

		this.blueprint.getFakeGenerics().subscribeGenericsChanged(() => {
			this.ports.top.forEach(p => p.refresh());
			this.ports.bottom.forEach(p => p.refresh());

			this.connections.forEach(component => {
				const connection = component.getConnection();
				if (!connection.source.isConnectedWith(connection.destination)) {
					return;
				}
				if (connection.source.getBox() === this.blueprint || connection.destination.getBox() === this.blueprint) {
					component.refresh();
				}
			});
		});

		this.blueprint.subscribeChildCreated(BlueprintPortModel, port => {
			if (port.isDirectionIn()) {
				const p = this.createIsolatedPort(port, `${this.blueprint.getIdentity()}_in`, `${this.blueprint.getShortName()} In-Port`, "top");
				this.buttons.attachTo(p.getShape(), "br");
				this.input.attachTo(p.getShape(), "c");
			} else {
				const p = this.createIsolatedPort(port, `${this.blueprint.getIdentity()}_out`, `${this.blueprint.getShortName()} Out-Port`, "bottom");
				this.output.attachTo(p.getShape(), "c");
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
			port.subscribeConnected(other => {
				this.addConnection({source: port, destination: other});
			});
			port.subscribeDisconnected(other => {
				this.removeConnection({source: port, destination: other});
			});
		});

		this.blueprint.subscribeChildCreated(OperatorModel, operator => {
			operator.getGenericSpecifications().subscribeGenericsChanged(() => {
				this.connections.forEach(component => {
					const connection = component.getConnection();
					if (!connection.source.isConnectedWith(connection.destination)) {
						return;
					}
					if (connection.source.getBox() === operator || connection.destination.getBox() === operator) {
						component.refresh();
					}
				});
			});
		});
	}

	public autoLayout() {
		const operatorRectangles = this.operators.map(operatorComponent => operatorComponent.getShape());
		const connectionLinks = this.connections.map(connectionComponent => connectionComponent.getShape());

		layout.DirectedGraph.layout(
			[
				...operatorRectangles,
				...connectionLinks,
				...this.ports.top.map(p => p.getShape()),
				...this.ports.bottom.map(p => p.getShape()),
				...this.ports.left.map(p => p.getShape()),
				...this.ports.right.map(p => p.getShape()),
			], {
				nodeSep: 80,
				rankSep: 80,
				edgeSep: 0,
				rankDir: "TB",
				resizeClusters: false,
			});

		const boundingBox = this.paperView.getCellsBBox(operatorRectangles) || new g.Rect({
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
			port.getShape().set({
				position: {
					x: boundingBox.x - 50 + boundingBox.width / 2,
					y: boundingBox.y - 100 - padding,
				}
			});
		}

		for (const port of this.ports.bottom) {
			port.getShape().set({
				position: {
					x: boundingBox.x - 50 + boundingBox.width / 2,
					y: boundingBox.y + boundingBox.height + padding,
				}
			});
		}

		const offset = boundingBox.y + (boundingBox.height - this.ports.right.length * 100) / 2;
		this.ports.right.forEach((port, index) => {
			port.getShape().set({
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

			this.ports.top.map(p => p.getShape()).forEach(port => {
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
			});

			this.ports.bottom.map(p => p.getShape()).forEach(port => {
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
			});

			this.ports.right.map(p => p.getShape()).forEach(port => {
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
		const portComponent = new IsolatedBlueprintPortComponent(this.paperView, name, id, port, invertedPosition[position]);
		const portElement = portComponent.getShape();
		this.paperView.renderCell(portElement);

		let calculateRestrictedRect: (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => g.PlainRect;

		const elementSize = portElement.get("size") as g.PlainRect;

		switch (position) {
			case "top":
				portElement.set({position: {x: -elementSize.width / 2, y: 0}});
				this.ports.top.push(portComponent);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y - elementSize.height,
					width: outerSize.width,
					height: elementSize.height
				});
				break;
			case "bottom":
				portElement.set({position: {x: -elementSize.width / 2, y: 0}});
				this.ports.bottom.push(portComponent);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y + outerSize.height,
					width: outerSize.width,
					height: elementSize.height
				});
				break;
			case "left":
				portElement.set({position: {x: 0, y: -elementSize.height / 2}});
				this.ports.left.push(portComponent);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x - elementSize.width,
					y: outerPosition.y,
					width: elementSize.width,
					height: outerSize.height
				});
				break;
			case "right":
				portElement.set({position: {x: 0, y: -elementSize.height / 2}});
				this.ports.right.push(portComponent);
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

		this.attachPortInfo(portComponent);

		return portComponent;
	}

	private addConnection(connection: Connection) {
		const connectionComponent = new ConnectionComponent(this.paperView, connection);
		this.connections.push(connectionComponent);
	}

	private addOperator(operator: OperatorModel): OperatorBoxComponent {

		const operatorComp = componentFactory.createOperatorComponent(this.paperView, operator);

		this.operators.push(operatorComp);

		const that = this;

		if (operator.hasProperties()) {
			operatorComp.onClick((event: Event, x: number, y: number) => {
				const comp = that
					.createComponent({x: 0, y: 0, align: "c"})
					.mount({
						view: () => m(Modal, {
								onClose: () => {
									comp.destroy();
								}
							},
							m(DashboardComponent, {
								operator: operator,
								onSave: () => {
									comp.destroy();
								}
							})
						)
					});
				return true;
			});
		}
		this.attachPortInfo(operatorComp);

		return operatorComp;
	}

	private attachPortInfo(portOwnerComp: OperatorBoxComponent | IsolatedBlueprintPortComponent) {
		const that = this;
		let portInfo: AttachableComponent;
		portOwnerComp.onPortMouseEnter((port: PortModel, x: number, y: number) => {
			portInfo = that
				.createComponent({x: x, y: y + 2, align: "tl"})
				.mount({
					view: () => m(PortInfo, {port})
				});
		});
		portOwnerComp.onPortMouseLeave((port: PortModel, x: number, y: number) => {
			portInfo.destroy();
		});
	}

	private removeConnection(connection: Connection) {
		const linkId = ConnectionComponent.getLinkId(connection);
		const link = ConnectionComponent.findLink(this.paperView, connection);
		if (link) {
			link.remove();
		}

		const idx = this.connections.findIndex(conn => conn.getId() === linkId);
		if (idx !== -1) {
			this.connections.splice(idx, 1);
		}
	}

	public onClick(cb: (event: MouseEvent, x: number, y: number) => void) {
		this.clicked.subscribe(({event, x, y}) => {
			cb(event, x, y);
		});
	}

	public onDblClick(cb: (event: MouseEvent, x: number, y: number) => void) {
		this.dblclicked.subscribe(({event, x, y}) => {
			cb(event, x, y);
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
}

export interface Attrs {
	port: PortModel,
}

class PortInfo implements ClassComponent<Attrs> {
	// Note that class methods cannot infer parameter types
	oninit({attrs}: CVnode<Attrs>) {
	}

	view({attrs}: CVnode<Attrs>) {
		const port = attrs.port;
		const portType = TypeIdentifier[port.getTypeIdentifier()].toLowerCase();

		return m(".sl-port-info",
			m(".sl-port-type", {
					class: `sl-type-${portType}`,
				},
				portType),
			m(".sl-port-name", port.getName())
		);
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

	export class Rect extends shapes.standard.Rectangle.define("WhiteBox", Styles.Defaults.Outer) {
		constructor(blackBox: BlackBox, size: Size) {
			super(constructRectAttrs({
				id: `${blackBox.getIdentity()}_outer`,
				size,
			}) as any);
			this.attr("draggable", false);
			this.set("obstacle", false);
		}
	}
}
