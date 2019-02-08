import {dia} from "jointjs";

import {XY} from "../../definitions/api";
import {TypeIdentifier} from "../../definitions/type";

import {GenericPortModel, PortModel} from "../../core/abstract/port";
import {GenericSpecifications} from "../../core/abstract/utils/generics";
import {PropertyAssignments} from "../../core/abstract/utils/properties";
import {BlueprintModel} from "../../core/models/blueprint";
import {LandscapeModel} from "../../core/models/landscape";

import {BlackBoxShape} from "../components/blackbox";
import {BlueprintSelectComponent} from "../components/blueprint-select";
import {ConnectionComponent} from "../components/connection";
import {WhiteBoxComponent} from "../components/whitebox";
import {ViewFrame} from "../frame";
import {PaperView, PaperViewArgs} from "./paper-view";

export class BlueprintView extends PaperView {
	private readonly whiteBox: WhiteBoxComponent;
	private readonly landscape: LandscapeModel;
	private blueprintSelect: BlueprintSelectComponent | null = null;

	constructor(frame: ViewFrame, private blueprint: BlueprintModel, args: PaperViewArgs) {
		super(frame, args);
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
							portS.connect(portT, true);
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

		if (this.isReadOnly) {
			return paper;
		}

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
		if (this.isReadOnly) {
			return;
		}

		this.whiteBox.onDblClick((_event: Event, x: number, y: number) => {
			this.blueprintSelect = new BlueprintSelectComponent(this, {x, y});
		});
		this.graph.on("change:position change:size", (cell: dia.Cell) => {
			// Moving around inner operators
			if (!(cell instanceof BlackBoxShape)) {
				return;
			}
			this.fitOuter(false);
		});

		this.getPaper().on("blank:pointerclick cell:pointerclick", () => {
			if (this.blueprintSelect) {
				this.blueprintSelect.destroy();
				this.blueprintSelect = null;
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

	private createValueOperator(xy: XY, targetPort: PortModel) {
		// slang.data.Value
		const valueBlueprint = this.landscape.findBlueprint("8b62495a-e482-4a3e-8020-0ab8a350ad2d")!;

		const generics = new GenericSpecifications(Array.from(valueBlueprint.getGenericIdentifiers()));
		generics.specify("valueType", targetPort.getType());
		const properties = new PropertyAssignments(Array.from(valueBlueprint.getProperties()), generics);

		const valueOperator = this.blueprint.createOperator(null, valueBlueprint, properties, generics, {position: xy});
		valueOperator.getPortOut()!.connect(targetPort, false);
	}
}

export interface Attrs {
	port: PortModel;
}
