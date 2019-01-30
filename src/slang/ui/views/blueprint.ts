import m, {ClassComponent, CVnode} from "mithril";
import {BlackBoxShape} from "../components/blackbox";
import {BlueprintModel} from "../../model/blueprint";
import {ViewFrame} from "../frame";
import {PaperView} from "./paper-view";
import {GenericPortModel, PortModel} from "../../model/port";
import {BlueprintSelectComponent} from "../components/blueprint-select";
import {ConnectionComponent} from "../components/connection";
import {WhiteBoxComponent} from "../components/whitebox";
import {dia} from "jointjs";
import {AttachableComponent, XY} from "../components/base";
import {LandscapeModel} from "../../model/landscape";
import {PropertyAssignments} from "../../model/property";
import {GenericSpecifications} from "../../custom/generics";
import {TypeIdentifier} from "../../custom/type";

export class BlueprintView extends PaperView {
	private readonly whiteBox: WhiteBoxComponent;
	private readonly landscape: LandscapeModel;
	private blueprintSelect: BlueprintSelectComponent | null = null;

	constructor(frame: ViewFrame, private blueprint: BlueprintModel) {
		super(frame);
		this.addPanning();
		this.landscape = this.blueprint.getAncestorNode(LandscapeModel)!;
		this.whiteBox = new WhiteBoxComponent(this, blueprint);
		this.attachEventHandlers();
		this.fit();
	}

	protected createPaper(): dia.Paper {
		const that = this;
		const paper = super.createPaper({
			linkPinning: true,
			allowLink: function (linkView: dia.LinkView): boolean {
				const magnetS = linkView.getEndMagnet("source");
				if (!magnetS) {
					return false;
				}
				const portS = that.getPortFromMagnet(magnetS);
				if (!portS) {
					return false;
				}

				const magnetT = linkView.getEndMagnet("target");
				if (magnetT) {
					const portT = that.getPortFromMagnet(magnetT);
					if (portT) {
						if (portS.canConnect(portT)) {
							try {
								portS.connect(portT);
							} catch (e) {
								console.error(e);
							}
						}
					}
				} else {
					if (portS.isDirectionIn() &&
						!portS.isConnected() &&
						portS.getType().isPrimitive() &&
						portS.getTypeIdentifier() !== TypeIdentifier.Trigger) {
						that.createValueOperator(linkView.getEndAnchor("target"), portS);
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

		this.whiteBox.onDblClick((event: Event, x: number, y: number) => {
			that.blueprintSelect = new BlueprintSelectComponent(that, {x, y});
		});
		let portInfo: AttachableComponent;
		this.whiteBox.onPortMouseEnter((port: PortModel, x: number, y: number) => {
			portInfo = that.whiteBox
				.createComponent({x: x + 2, y: y + 2, align: "tl"})
				.mount({
					view: () => m(PortInfo, {port})
				});
		});
		this.whiteBox.onPortMouseLeave((port: PortModel, x: number, y: number) => {
			portInfo.destroy();
		});

		this.graph.on("change:position change:size", function (cell: dia.Cell) {
			// Moving around inner operators
			if (!(cell instanceof BlackBoxShape)) {
				return;
			}
			that.fitOuter(false);
		});

		this.getPaper().on("blank:pointerclick cell:pointerclick", function (elementView: dia.ElementView, evt: JQueryMouseEventObject, x: number, y: number) {
			if (that.blueprintSelect) {
				that.blueprintSelect.destroy();
				that.blueprintSelect = null;
			}
		});
	}

	private fitOuter(animation: boolean) {
		this.whiteBox.fitOuter(animation);
	}

	private getPortFromMagnet(magnet: SVGElement): PortModel | undefined {
		if (!magnet) {
			return undefined;
		}
		let portId = magnet.getAttribute("port");
		if (!portId) {
			return undefined;
		}
		if (portId.endsWith(".*")) {
			portId = portId.substring(0, portId.length - 2);
		}
		const port = this.blueprint.findNodeById(portId);
		if (!port || !(port instanceof GenericPortModel)) {
			return undefined;
		}
		return port;
	}

	private createValueOperator(xy: XY, portDst: PortModel) {
		const valueBlueprint = this.landscape.findBlueprint("slang.data.Value")!;

		const genSpeci = new GenericSpecifications(Array.from(valueBlueprint.getGenericIdentifiers()));
		genSpeci.specify("valueType", portDst.getType());
		const propAssigns = new PropertyAssignments(Array.from(valueBlueprint.getProperties()), genSpeci);

		const valueOperator = this.blueprint.createOperator(null, valueBlueprint, propAssigns, genSpeci, {position: xy});
		valueOperator.getPortOut()!.connect(portDst);
	}

	public getBlueprint(): BlueprintModel {
		return this.blueprint;
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

