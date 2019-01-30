import {dia, g, shapes, util} from "jointjs";
import {ViewFrame} from "../frame";
import {View} from "./view";
import {SlangSubjectTrigger} from "../../custom/events";
import {XY} from "../components/base";


export abstract class PaperView extends View {
	private positionChanged = new SlangSubjectTrigger("positionChanged");

	protected readonly graph = new dia.Graph();
	private readonly paper: dia.Paper;

	private userInputMode: "scroll" | "hscroll" | "zoom/pan" = "scroll";

	private scaleSpeed: number = 0.002;
	private minScale: number = 0.35;
	private maxScale: number = 2.5;

	protected constructor(frame: ViewFrame) {
		super(frame);
		this.paper = this.createPaper();
		this.redirectPaperEvents();
	}

	protected reset() {
		this.paper.scale(1.0);
		this.center();
	}

	protected center() {
		this.paper.setOrigin(this.paper.options.width as number / 2, this.paper.options.height as number / 2);
		this.positionChanged.next();
	}

	protected fit() {
		this.paper.scaleContentToFit();
		this.positionChanged.next();
	}

	protected createPaper(opt: dia.Paper.Options = {}): dia.Paper {
		const container = this.getViewElement();
		container.innerHTML = "";
		const inner = document.createElement("div");
		container.appendChild(inner);

		opt = Object.assign({
			el: inner,
			model: this.graph,
			gridSize: 5,
			drawGrid: false,
			interactive: function (cellView: dia.CellView) {
				if (cellView.model.attr("draggable") === false) {
					return false;
				}
				if (cellView.model.isLink()) {
					return {vertexAdd: false};
				}
				return true;
			},
			restrictTranslate: function (elementView: dia.ElementView): g.PlainRect {
				const fn = elementView.model.get("restrictTranslate");
				if (typeof fn === "function") {
					return fn();
				}
				return {
					x: -(Number.MAX_VALUE / 2),
					y: -(Number.MAX_VALUE / 2),
					width: Number.MAX_VALUE,
					height: Number.MAX_VALUE
				};
			},
		}, opt);

		return new dia.Paper(opt);
	}

	protected handleMouseWheel(evt: MouseWheelEvent, x: number, y: number): boolean {
		switch (this.userInputMode) {
			case "scroll":
				this.scroll(-evt.deltaX, -evt.deltaY);
				return false;
			case "hscroll":
				this.scroll(-evt.deltaY, 0);
				return false;
			case "zoom/pan":
				this.zoom(x, y, evt.deltaY);
				return false;
		}
		return true;
	}

	protected setUserInputMode(evt: KeyboardEvent) {
		if (evt.ctrlKey || evt.metaKey) {
			this.userInputMode = "zoom/pan";
			return false;
		} else if (evt.shiftKey) {
			this.userInputMode = "hscroll";
			return false;
		}
		return true;
	}

	protected redirectPaperEvents() {
		const paper = this.paper;
		const that = this;

		document.addEventListener("keydown", (event: KeyboardEvent) => {
			event.preventDefault();
			if (!this.setUserInputMode(event)) {
				event.stopPropagation();
			}
		});

		document.addEventListener("keyup", (event: KeyboardEvent) => {
			this.userInputMode = "scroll";
		});

		paper.on("blank:mousewheel", ({originalEvent}: JQueryMouseEventObject, x: number, y: number) => {
			originalEvent.preventDefault();
			if (!that.handleMouseWheel(originalEvent as MouseWheelEvent, x, y)) {
				originalEvent.stopPropagation();
			}
		});

		paper.on("cell:mousewheel", function (cellView: dia.CellView, {originalEvent}: JQueryMouseEventObject, x: number, y: number, delta: number) {
			originalEvent.preventDefault();
			if (!that.handleMouseWheel(originalEvent as MouseWheelEvent, x, y)) {
				originalEvent.stopPropagation();
			}
		});

		["mousewheel"].forEach(eventName => {
			(function (eventName) {
				paper.on("cell:" + eventName, function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
					cellView.model.trigger(eventName, cellView, evt, x, y, delta);
				});
			})(eventName);
		});
		["pointerdblclick", "pointerclick", "contextmenu", "pointerdown", "pointermove", "pointerup"].forEach(eventName => {
			(function (eventName) {
				paper.on("cell:" + eventName, function (cellView: dia.CellView, evt: Event, x: number, y: number) {
					cellView.model.trigger(eventName, cellView, evt, x, y);
				});
			})(eventName);
		});
		["mouseover", "mouseout", "mouseenter", "mouseleave"].forEach(eventName => {
			(function (eventName) {
				paper.on("cell:" + eventName, function (cellView: dia.CellView, evt: MouseEvent, x: number, y: number) {
					const evTarget = (evt.target as Node);
					if (evTarget && evTarget.parentElement) {
						const portId = evTarget.parentElement.getAttribute("port");
						if (portId) {
							const {clientX, clientY} = evt;
							const {x, y} = that.toLocalXY({x: clientX, y: clientY});
							cellView.model.trigger("port:" + eventName, cellView, evt, x, y, portId);
							return;
						}
					}
					cellView.model.trigger(eventName, cellView, evt);
				});
			})(eventName);
		});
	}


	protected zoom(x: number, y: number, delta: number) {
		const oldScale = this.paper.scale().sx;
		const deltaScale = oldScale * delta * this.scaleSpeed;
		const newScale = Math.max(this.minScale, Math.min(this.maxScale, oldScale - deltaScale));

		const translation = this.paper.translate();
		const [px, py] = [translation.tx, translation.ty];
		const deltaPx = x * (oldScale - newScale);
		const deltaPy = y * (oldScale - newScale);

		this.paper.scale(newScale);
		this.paper.translate(px + deltaPx, py + deltaPy);
		this.positionChanged.next();
	}

	protected scroll(deltaX: number, deltaY: number) {
		const translation = this.paper.translate();
		const [px, py] = [translation.tx, translation.ty];

		this.paper.translate(px + deltaX, py + deltaY);
		this.positionChanged.next();
	}

	protected addPanning() {
		const that = this;
		const paper = this.paper;

		let panning = false;
		let startX: number = 0;
		let startY: number = 0;

		const startPanning = function (x: number, y: number) {
			const scale = paper.scale().sx;
			startX = x * scale;
			startY = y * scale;
			panning = true;
		};

		const stopPanning = function () {
			panning = false;
		};

		const doPanning = function (x: number, y: number) {
			if (panning && that.userInputMode == "zoom/pan") {
				paper.translate(x - startX, y - startY);
				that.positionChanged.next();
			}
		};

		paper.on("blank:pointerdown", function (evt: Event, x: number, y: number) {
			evt.preventDefault();
			if (that.userInputMode == "zoom/pan") {
				startPanning(x, y);
			}
		});
		paper.on("cell:pointerdown", function (cellView: dia.CellView, evt: Event, x: number, y: number) {
			evt.preventDefault();
			if (that.userInputMode == "zoom/pan") {
				startPanning(x, y);
			}
		});
		paper.on("blank:pointerup", function (evt: Event, x: number, y: number) {
			stopPanning();
		});
		paper.on("cell:pointerup", function (cellView: dia.CellView, evt: Event, x: number, y: number) {
			stopPanning();
		});
		paper.svg.addEventListener("mousemove", function (event: any) {
			doPanning(event.offsetX, event.offsetY);
		});
	}


	protected getWidth(): number {
		return this.paper.getArea().width;
	}

	protected getHeight(): number {
		return this.paper.getArea().height;
	}

	protected addOriginPoint() {
		const origin = new shapes.standard.Circle({
			size: {
				width: 4,
				height: 4,
			},
			position: {
				x: -2,
				y: -2,
			}
		}).addTo(this.graph);

		origin.attr("body/fill", "blue");
		origin.attr("body/fill-opacity", ".05");
		origin.attr("body/rx", "24");
		origin.attr("body/ry", "24");
		origin.attr("draggable", false);
		origin.set("obstacle", false);
	}

	public resize(width: number, height: number) {
		this.paper.setDimensions(width, height);
		this.paper.translate(width / 2, height / 2);
		this.positionChanged.next();
	}

	public toClientXY(xy: XY): XY {
		return this.paper.localToClientPoint(xy);
	}

	public toLocalXY(xy: XY): XY {
		return this.paper.clientToLocalPoint(xy);
	}

	public getPaper(): dia.Paper {
		return this.paper;
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

	public getViewElement(): HTMLElement {
		return this.getFrame().getHTMLElement();
	}

	//protected abstract onMouseWheel(event: MouseEvent): void;
}

(util.filter as any).innerShadow = function (args: any) {
	return `<filter>
<feComponentTransfer in="SourceAlpha">
    <feFuncA type="table" tableValues="1 0" />
</feComponentTransfer>
<feGaussianBlur stdDeviation="${Number.isFinite(args.blur) ? args.blur : 4}"/>
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