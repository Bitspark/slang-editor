import {dia, g, util} from "jointjs";

import {SlangAspects} from "../../aspects";
import {SlangSubjectTrigger} from "../../core/abstract/utils/events";
import {XY} from "../../definitions/api";
import {ViewFrame} from "../frame";

import {View} from "./view";

export interface PaperViewArgs {
	hscrollable: boolean;
	vscrollable: boolean;
	editable: boolean;
	descendable?: boolean;
}

export abstract class PaperView extends View {
	public readonly paper: dia.Paper;

	protected readonly graph = new dia.Graph();
	private positionChanged = new SlangSubjectTrigger("positionChanged");
	private escapePressed = new SlangSubjectTrigger("keypressed-escape");

	private scaleSpeed: number = 0.1;
	private minScale: number = 0.35;
	private maxScale: number = 2.5;

	protected constructor(frame: ViewFrame, aspects: SlangAspects, private args: PaperViewArgs) {
		super(frame, aspects);
		this.paper = this.createPaper();
		this.paintGrid();
		this.redirectPaperEvents();
	}

	public paintGrid() {
		// Draw a double mesh gird, where the smaller pattern is a filler for the bigger.
		// Use that that to create a bitmap from an svg and use this as data background url.
		const data =
			'<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"> \
				<defs> \
					<pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse"> \
						<path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" stroke-width="0.5" stroke-opacity="0.2" /> \
					</pattern> \
					<pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"> \
						<rect width="100" height="100" fill="url(#smallGrid)" /> \
						<path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" stroke-width="1" stroke-opacity="0.3" /> \
					</pattern> \
				</defs> \
				<rect width="100%" height="100%" fill="url(#grid)" /> \
			</svg>';

		const svg = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
		const url = URL.createObjectURL(svg);

		this.paper.$el.css("background-image", 'url("' + url + '")');
	}

	public get isEditable(): boolean {
		return this.args.editable;
	}

	public get isReadOnly(): boolean {
		return !this.isEditable;
	}

	public get isDescendable(): boolean {
		return this.args.descendable === true;
	}

	public resize(width: number, height: number) {
		this.paper.setDimensions(width, height);
		this.paper.translate(width / 2, height / 2);
		this.positionChanged.next();
	}

	public toBrowserXY(xy: XY): XY {
		return this.paper.localToPaperPoint(xy);
	}

	public toSVGXY(xy: XY): XY {
		return this.paper.clientToLocalPoint(xy);
	}

	public getCell(id: string | number | dia.Cell): dia.Cell {
		return this.graph.getCell(id);
	}

	public getCellsBBox(cells: dia.Cell[]): g.Rect | null {
		return this.graph.getCellsBBox(cells);
	}

	public renderCell(cell: dia.Cell) {
		cell.addTo(this.graph);
	}

	public subscribePositionChanged(cb: () => void): void {
		this.positionChanged.subscribe(cb);
	}

	public onEscapePressed(cb: () => void): void {
		this.escapePressed.subscribe(cb);
	}

	protected center() {
		this.paper.setOrigin((this.paper.options.width as number) / 2, (this.paper.options.height as number) / 2);
		this.positionChanged.next();
	}

	protected fit() {
		this.paper.scaleContentToFit();
		this.positionChanged.next();
	}

	protected createPaper(opt: dia.Paper.Options = {}): dia.Paper {
		const container = this.rootEl;
		container.innerHTML = "";
		const inner = document.createElement("div");
		container.appendChild(inner);
		const view = this;

		return new dia.Paper(
			Object.assign(
				{
					el: inner,
					model: this.graph,
					gridSize: 5,
					drawGrid: false,
					interactive(cellView: dia.CellView) {
						if (view.isReadOnly) {
							return false;
						}

						if (cellView.model.attr("draggable") === false) {
							return false;
						}
						if (cellView.model.isLink()) {
							return {vertexAdd: false};
						}
						return true;
					},
					restrictTranslate(elementView: dia.ElementView): g.PlainRect {
						const fn = elementView.model.get("restrictTranslate");
						if (typeof fn === "function") {
							return fn();
						}
						return {
							x: -(Number.MAX_VALUE / 2),
							y: -(Number.MAX_VALUE / 2),
							width: Number.MAX_VALUE,
							height: Number.MAX_VALUE,
						};
					},
				},
				opt,
			),
		);
	}

	protected handleMouseWheel(evt: WheelEvent, x: number, y: number, delta: number): boolean {
		if (!this.isZooming(evt)) {
			return false;
		}
		this.zoom(x, y, delta);
		return true;
	}

	protected isZooming(evt: MouseEvent): boolean {
		return evt.ctrlKey || evt.metaKey;
	}

	protected isPanning(evt: MouseEvent): boolean {
		// evt.buttons === 1 means the primary button is pressed
		return (evt.ctrlKey || evt.metaKey) && evt.buttons === 1;
	}

	protected redirectPaperEvents() {
		document.addEventListener("keyup", (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				this.escapePressed.next();
			}
		});

		this.paper.on("blank:mousewheel", ({originalEvent}: JQueryMouseEventObject, x: number, y: number, direction: number) => {
			const handled = this.handleMouseWheel(originalEvent as WheelEvent, x, y, direction);
			if (handled) {
				originalEvent.preventDefault();
				originalEvent.stopPropagation();
			}
		});

		this.paper.on("cell:mousewheel", (_cellView: dia.CellView, {originalEvent}: JQueryMouseEventObject, x: number, y: number, direction: number) => {
			const handled = this.handleMouseWheel(originalEvent as WheelEvent, x, y, direction);
			if (handled) {
				originalEvent.preventDefault();
				originalEvent.stopPropagation();
			}
		});

		["mousewheel"].forEach((eventName) => {
			this.paper.on("cell:" + eventName, (cellView: dia.CellView, evt: Event, x: number, y: number, direction: number) => {
				cellView.model.trigger(eventName, cellView, evt, x, y, direction);
			});
		});
		["pointerdblclick", "pointerclick", "contextmenu", "pointerdown", "pointermove", "pointerup"].forEach((eventName) => {
			this.paper.on("cell:" + eventName, (cellView: dia.CellView, evt: Event, x: number, y: number) => {
				cellView.model.trigger(eventName, cellView, evt, x, y);
			});
		});
		["mouseover", "mouseout", "mouseenter", "mouseleave"].forEach((eventName) => {
			this.paper.on("cell:" + eventName, (cellView: dia.CellView, evt: MouseEvent) => {
				const evTarget = evt.target as Node;
				if (evTarget && evTarget.parentElement) {
					const portId = evTarget.parentElement.getAttribute("port");
					if (portId) {
						const {clientX, clientY} = evt;
						const {x, y} = this.toSVGXY({x: clientX, y: clientY});
						cellView.model.trigger("port:" + eventName, cellView, evt, x, y, portId);
						return;
					}
				}
				cellView.model.trigger(eventName, cellView, evt);
			});
		});
	}

	protected zoom(x: number, y: number, direction: number) {
		const oldScale = this.paper.scale().sx;
		const newScale = Math.max(Math.min(oldScale + direction * this.scaleSpeed, this.maxScale), this.minScale);

		const translation = this.paper.translate();

		// Zoom using the cursor postion as center
		const [px, py] = [translation.tx, translation.ty];
		const deltaPx = x * (oldScale - newScale);
		const deltaPy = y * (oldScale - newScale);
		this.paper.translate(px + deltaPx, py + deltaPy);

		this.paper.scale(newScale);
		this.positionChanged.next();
	}

	protected addPanning() {
		const paper = this.paper;

		let deltaX: number = 0;
		let deltaY: number = 0;
		let previousEvent: MouseEvent | null = null;

		const doPanning = (currentEvent: MouseEvent) => {
			if (!this.isPanning(currentEvent)) {
				previousEvent = null;
				return;
			}
			deltaX = previousEvent ? currentEvent.screenX - previousEvent.screenX : 0;
			deltaY = previousEvent ? currentEvent.screenY - previousEvent.screenY : 0;
			const {tx, ty} = paper.translate();
			paper.translate(tx + deltaX, ty + deltaY);
			previousEvent = currentEvent;
			this.positionChanged.next();
		};

		paper.svg.addEventListener("mousemove", (event: any) => {
			doPanning(event);
		});
	}
}

(util.filter as any).innerShadow = (args: any) => {
	const blurRadius = 4;
	return `<filter>
<feComponentTransfer in="SourceAlpha">
    <feFuncA type="table" tableValues="1 0" />
</feComponentTransfer>
<feGaussianBlur stdDeviation="${Number.isFinite(args.blur) ? args.blur : blurRadius}"/>
<feOffset dx="${args.dx || 0}" dy="${args.dy || 0}" result="offsetblur"/>
<feFlood flood-color="${args.color || "black"}" result="color"/>
<feComposite in2="offsetblur" operator="in"/>
<feComposite in2="SourceAlpha" operator="in" />
<feMerge>
    <feMergeNode in="SourceGraphic" />
    <feMergeNode />
</feMerge>
</filter>`;
};

(util.filter as any).dropShadow = (args: any) => {
	const blurRadius = 4;
	return `<filter>
<feGaussianBlur in="SourceAlpha" stdDeviation="${Number.isFinite(args.blur) ? args.blur : blurRadius}"/>
<feOffset dx="${args.dx || 0}" dy="${args.dy || 0}" result="offsetblur"/>
<feFlood flood-color="${args.color || "black"}" />
<feComposite in2="offsetblur" operator="in"/>
<feMerge>
	<feMergeNode />
	<feMergeNode in="SourceGraphic" />
</feMerge>
</filter>`;
};
