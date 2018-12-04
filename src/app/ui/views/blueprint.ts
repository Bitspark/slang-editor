import {BlackBoxComponent} from "../components/blackbox";
import {BlueprintModel} from "../../model/blueprint";
import {ViewFrame} from "../frame";
import {PaperView} from "./paper-view";
import {GenericPortModel, PortModel} from "../../model/port";
import {BlueprintSelectComponent} from "../components/blueprint-select";
import {ConnectionComponent} from "../components/connection";
import {WhiteBoxComponent} from "../components/whitebox";
import {dia} from "jointjs";

export class BlueprintView extends PaperView {
	private readonly whiteBox: WhiteBoxComponent;
	private blueprintSelect: BlueprintSelectComponent | null = null;

	constructor(frame: ViewFrame, private blueprint: BlueprintModel) {
		super(frame);
		this.addZooming();
		this.addPanning();

		this.whiteBox = new WhiteBoxComponent(this, blueprint);

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
		this.getPaper().on("cell:pointerdblclick", function (elementView: dia.ElementView, evt: JQueryMouseEventObject, x: number, y: number) {
			that.blueprintSelect = new BlueprintSelectComponent(that, {x, y});
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
		console.log(portId);
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