import {BlackBoxComponent, OperatorBoxComponent} from "../components/blackbox";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {Connection} from "../../custom/connections";
import {ViewFrame} from "../frame";
import {PaperView} from "./paper-view";
import {BlueprintPortModel, GenericPortModel, PortModel} from "../../model/port";
import {IsolatedBlueprintPortComponent} from "../components/blueprint-port";
import {PortGroupPosition} from "../components/port-group";
import {BlueprintSelectComponent} from "../components/blueprint-select";
import {ConnectionComponent} from "../components/connection";
import {BlueprintDelegateModel} from "../../model/delegate";
import {WhiteBoxComponent} from "../components/whitebox";
import {dia, g} from "jointjs";

export class BlueprintView extends PaperView {
	private topPorts: Array<dia.Element> = [];
	private bottomPorts: Array<dia.Element> = [];
	private rightPorts: Array<dia.Element> = [];
	private leftPorts: Array<dia.Element> = [];
	private operators: Array<BlackBoxComponent> = [];
	private connections: Array<ConnectionComponent> = [];

	private readonly outer: WhiteBoxComponent;
	private blueprintSelect: BlueprintSelectComponent | null;

	constructor(frame: ViewFrame, private blueprint: BlueprintModel) {
		super(frame);
		this.addZooming();
		this.addPanning();

		this.subscribe();

		this.outer = new WhiteBoxComponent(this, blueprint);
		this.autoLayout();
		this.fitOuter(false);

		this.attachEventHandlers();

		this.fit();
	}

	protected createPaper(): dia.Paper {
		const that = this;
		const paper = super.createPaper({
			allowLink: function (linkView: dia.LinkView): boolean {
				const magnetS = linkView.getEndMagnet("source");
				if (!magnetS) {
					return false;
				}
				const magnetT = linkView.getEndMagnet("target");
				if (!magnetT) {
					return false;
				}

				const portS = that.getPortFromMagnet(magnetS);
				if (!portS) {
					return false;
				}
				const portT = that.getPortFromMagnet(magnetT);
				if (!portT) {
					return false;
				}

				if (portS.canConnect(portT)) {
					try {
						portS.connect(portT);
					} catch (e) {
						console.error(e);
					}
				}

				return false;
			},
			defaultLink: function (cellView: dia.CellView, magnet: SVGElement): dia.Link {
				const port = that.getPortFromMagnet(magnet);
				if (port) {
					const link = ConnectionComponent.createGhostLink(port);
					link.on("remove", () => {
						link.transition("attrs/.connection/stroke-opacity", 0.0);
					});
					return link;
				} else {
					throw new Error(`could not find source port`);
				}
			},
			validateConnection: function (cellViewS: dia.CellView,
										  magnetS: SVGElement,
										  cellViewT: dia.CellView,
										  magnetT: SVGElement,
										  end: "source" | "target",
										  linkView: dia.LinkView): boolean {
				const portS = that.getPortFromMagnet(magnetS);
				if (!portS) {
					return false;
				}
				const portT = that.getPortFromMagnet(magnetT);
				if (!portT) {
					return false;
				}

				return portS.canConnect(portT);
			},
			snapLinks: {radius: 75,},
			markAvailable: true,
		});
		paper.on("tool:remove", function (linkView: dia.LinkView) {
			const magnetS = linkView.getEndMagnet("source");
			const magnetT = linkView.getEndMagnet("target");
			if (!magnetS || !magnetT) {
				return false;
			}

			const sourcePortRef = magnetS.getAttribute("port");
			const destinationPortRef = magnetT.getAttribute("port");
			if (!sourcePortRef || !destinationPortRef) {
				return false;
			}

			const sourcePort = that.blueprint.findNodeById(sourcePortRef);
			const destinationPort = that.blueprint.findNodeById(destinationPortRef);
			if (!sourcePort || !destinationPort ||
				!(sourcePort instanceof GenericPortModel) || !(destinationPort instanceof GenericPortModel)) {
				return false;
			}

			sourcePort.disconnectTo(destinationPort);
		});
		return paper;
	}

	private attachEventHandlers() {
		const that = this;
		this.graph.on("change:position change:size", function (cell: dia.Cell) {
			// Moving around inner operators
			if (!(cell instanceof BlackBoxComponent.Rect)) {
				return;
			}
			that.fitOuter(false);
		});
		this.outer.shape.on("pointerdblclick", function (elementView: dia.ElementView, evt: JQueryMouseEventObject, x: number, y: number) {
			that.blueprintSelect = new BlueprintSelectComponent(that, {x, y});
		});
		this.getPaper().on("blank:pointerclick cell:pointerclick", function (elementView: dia.ElementView, evt: JQueryMouseEventObject, x: number, y: number) {
			if (that.blueprintSelect) {
				that.blueprintSelect.destroy();
				that.blueprintSelect = null;
			}
		});
	}

	private subscribe() {
		this.blueprint.subscribeChildCreated(OperatorModel, operator => {
			this.addOperator(operator);
		});

		this.blueprint.subscribeChildCreated(BlueprintPortModel, port => {
			if (port.isDirectionIn()) {
				this.createIsolatedPort(port, `${this.blueprint.getIdentity()}_in`, `${this.blueprint.getShortName()} In-Port`, "top");
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
			port.subscribeStreamTypeChanged(() => {
				this.connections
					.filter(connectionComponent => connectionComponent.getConnection().source === port)
					.forEach(connectionComponent => connectionComponent.refresh());
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

	private createIsolatedPort(port: BlueprintPortModel, id: string, name: string, position: PortGroupPosition): void {
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
				this.topPorts.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y - elementSize.height,
					width: outerSize.width,
					height: elementSize.height
				});
				break;
			case "bottom":
				portElement.set({position: {x: -elementSize.width / 2, y: 0}});
				this.bottomPorts.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x,
					y: outerPosition.y + outerSize.height,
					width: outerSize.width,
					height: elementSize.height
				});
				break;
			case "left":
				portElement.set({position: {x: 0, y: -elementSize.height / 2}});
				this.leftPorts.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x - elementSize.width,
					y: outerPosition.y,
					width: elementSize.width,
					height: outerSize.height
				});
				break;
			case "right":
				portElement.set({position: {x: 0, y: -elementSize.height / 2}});
				this.rightPorts.push(portElement);
				calculateRestrictedRect = (outerPosition: g.PlainPoint, outerSize: g.PlainRect) => ({
					x: outerPosition.x + outerSize.width,
					y: outerPosition.y,
					width: elementSize.width,
					height: outerSize.height
				});
				break;
		}

		portElement.set("restrictTranslate", function (): g.PlainRect {
			const outerPosition = that.outer.shape.get("position") as g.PlainPoint;
			const outerSize = that.outer.shape.get("size") as g.PlainRect;
			return calculateRestrictedRect(outerPosition, outerSize);
		});
	}

	private addConnection(connection: Connection) {
		const connectionComponent = new ConnectionComponent(this.graph, connection);
		this.connections.push(connectionComponent);
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

	private autoLayout() {
		this.outer.autoLayout({
			operators: this.operators,
			ports: {
				l: this.leftPorts,
				r: this.rightPorts,
				t: this.topPorts,
				b: this.bottomPorts,
			}
		});
	}

	private addOperator(operator: OperatorModel) {
		const operatorElement = new OperatorBoxComponent(this.graph, operator);
		this.operators.push(operatorElement);

		if (this.outer) {
			this.fitOuter(true);
		}

		// JointJS -> Model
		operatorElement.on("pointerclick", function (evt: Event, x: number, y: number) {
			operator.select();
		});
	}

	private fitOuter(animation: boolean) {
		this.outer.fitOuter(animation, {
				operators: this.operators,
				ports: {
					l: this.leftPorts,
					r: this.rightPorts,
					t: this.topPorts,
					b: this.bottomPorts,
				}
			}
		);
	}

	private getPortFromMagnet(magnet: SVGElement): PortModel | undefined {
		if (!magnet) {
			return undefined;
		}
		const portId = magnet.getAttribute("port");
		if (!portId) {
			return undefined;
		}
		const port = this.blueprint.findNodeById(portId);
		if (!port || !(port instanceof GenericPortModel)) {
			return undefined;
		}
		return port;
	}

	public getBlueprint(): BlueprintModel {
		return this.blueprint;
	}

}