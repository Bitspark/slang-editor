import {dia} from "jointjs";

import {SlangAspects} from "../../aspects";
import {GenericPortModel, PortModel} from "../../core/abstract/port";
import {SlangBehaviorSubject, SlangSubject} from "../../core/abstract/utils/events";
import {BlueprintModel} from "../../core/models";
import {TypeIdentifier} from "../../definitions/type";
import {BlackBoxShape, OperatorBoxComponent} from "../components/blackbox";
import {ConnectionComponent} from "../components/connection";
import {WhiteBoxComponent} from "../components/whitebox";
import {ViewFrame} from "../frame";

import {PaperView, PaperViewArgs} from "./paper-view";
import { UserEvent } from "./user-events";

export type SelectableComponent = OperatorBoxComponent | WhiteBoxComponent | ConnectionComponent;

export class BlueprintView extends PaperView {
	public readonly whiteBox: WhiteBoxComponent;
	public readonly selected = new SlangBehaviorSubject<SelectableComponent|null>("element-selected", null);
	public readonly userInteracted = new SlangSubject<UserEvent>("user-interacted");

	constructor(frame: ViewFrame, aspects: SlangAspects, public readonly blueprint: BlueprintModel, args: PaperViewArgs) {
		super(frame, aspects, args);
		this.addPanning();
		this.whiteBox = new WhiteBoxComponent(this, blueprint);
		this.attachEventHandlers();
		this.fit();
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
					// The user let go of a connection on the paperview
					return false;
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

		this.graph.on("change:position change:size", (cell: dia.Cell) => {
			// Moving around inner operators
			if (!(cell instanceof BlackBoxShape)) {
				return;
			}
			this.fitOuter(false);
		});

		const unselectCurrentOne = () => {
			const currSelected = this.selected.getValue();
			if (currSelected) {
				currSelected.unselect();
			}
		};

		this.paper.on("blank:pointerdown cell:pointerdown", () => {
			unselectCurrentOne();
		});

		/*
		const handleSelect = (comp: SelectableComponent) => (selected: boolean) => {
			unselectCurrentOne();
			if (selected) {
				this.selected.next(comp);
			}
			// todo: set cssClass within Component class
			comp.css({
				"sl-is-selected": selected,
			});
		};
		*/

		const handleUserEvents = (comp: SelectableComponent) => (event: UserEvent) => {
			event.target = comp
			this.userInteracted.next(event);
		};

		//const registerSelectHandle = (comp: SelectableComponent) => comp.selected.subscribe(handleSelect(comp));
		const registerUserEventsHandle = (comp: SelectableComponent) => comp.userInteracted.subscribe(handleUserEvents(comp));

		const whiteBox = this.whiteBox;
		registerUserEventsHandle(whiteBox);
		whiteBox.operatorAdded.subscribe(registerUserEventsHandle);
		whiteBox.operators.map(registerUserEventsHandle);
		whiteBox.connectionAdded.subscribe(registerUserEventsHandle);
		whiteBox.connections.map(registerUserEventsHandle);
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

	public onUserEvent(cb: (e: UserEvent) => void) {
		this.userInteracted.subscribe((event) => {
			cb(event);
		});
	}
}
