import {dia} from "jointjs";
import {XY} from "../../core/definitions/geometry";
import {TypeIdentifier} from "../../core/definitions/type";
import {BlueprintModel} from "../../core/models/blueprint";
import {LandscapeModel} from "../../core/models/landscape";
import {GenericPortModel, GenericSpecifications, PortModel} from "../../core/models/port";
import {PropertyAssignments} from "../../core/utils/property";
import {BlackBoxShape} from "../components/blackbox";
import {ConnectionComponent} from "../components/connection";
import {WhiteBoxComponent} from "../components/whitebox";
import {ViewFrame} from "../frame";
import {PaperView} from "./paper-view";

export class BlueprintView extends PaperView {
	private readonly whiteBox: WhiteBoxComponent;
	private readonly landscape: LandscapeModel;

	constructor(frame: ViewFrame, private blueprint: BlueprintModel) {
		super(frame);
		this.addPanning();
		this.landscape = this.blueprint.getAncestorNode(LandscapeModel)!;
		this.whiteBox = new WhiteBoxComponent(this, blueprint);
		this.attachEventHandlers();
		this.fit();
	}

	public getBlueprint(): BlueprintModel {
		return this.blueprint;
	}

	protected createPaper(): dia.Paper {
		const that = this;
		const paper = super.createPaper({
			linkPinning: true,
			allowLink(linkView: dia.LinkView): boolean {
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
					if (portT && portS.canConnect(portT)) {
						try {
							portS.connect(portT);
						} catch (e) {
							console.error(e);
						}
					}
				} else if (portS.isDirectionIn() &&
					!portS.isConnected() &&
					portS.getType().isPrimitive() &&
					portS.getTypeIdentifier() !== TypeIdentifier.Trigger) {
					that.createValueOperator(linkView.getEndAnchor("target"), portS);
				}

				return false;
			},
			defaultLink: (_cellView: dia.CellView, magnet: SVGElement): dia.Link => {
				const port = that.getPortFromMagnet(magnet);
				if (port) {
					const link = ConnectionComponent.createGhostLink(port);
					link.on("remove", () => {
						link.transition("attrs/.connection/stroke-opacity", 0);
					});
					return link;
				}

				throw new Error(`could not find source port`);
			},
			validateConnection: (_cellViewS: dia.CellView, magnetS: SVGElement, _cellViewT: dia.CellView, magnetT: SVGElement): boolean => {
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
			snapLinks: {radius: 75},
			markAvailable: true,
		});
		paper.on("tool:remove", (linkView: dia.LinkView): void => {
			const magnetS = linkView.getEndMagnet("source");
			const magnetT = linkView.getEndMagnet("target");
			if (!magnetS || !magnetT) {
				return;
			}

			const sourcePortRef = magnetS.getAttribute("port");
			const destinationPortRef = magnetT.getAttribute("port");
			if (!sourcePortRef || !destinationPortRef) {
				return;
			}

			const sourcePort = that.blueprint.findNodeById(sourcePortRef);
			const destinationPort = that.blueprint.findNodeById(destinationPortRef);
			if (!sourcePort || !destinationPort ||
				!(sourcePort instanceof GenericPortModel) || !(destinationPort instanceof GenericPortModel)) {
				return;
			}

			sourcePort.disconnectTo(destinationPort);
		});
		return paper;
	}

	private attachEventHandlers() {
		this.graph.on("change:position change:size", (cell: dia.Cell) => {
			// Moving around inner operators
			if (!(cell instanceof BlackBoxShape)) {
				return;
			}
			this.fitOuter(false);
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
}
