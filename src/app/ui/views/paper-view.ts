import {dia, g, shapes, util} from "jointjs";
import {ViewFrame} from "../frame";
import {View} from "./view";
import {SlangSubjectTrigger} from "../../custom/events";
import {XY} from "../components/base";

export abstract class PaperView extends View {
	private positionChanged = new SlangSubjectTrigger("positionChanged");

	protected readonly graph = new dia.Graph();
	private readonly paper: dia.Paper;

	protected constructor(frame: ViewFrame) {
		super(frame);
		this.paper = this.createPaper();
		this.redirectPaperEvents();
		this.catchPaperEvents();
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
		const container = this.getFrame().getHTMLElement();
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

	protected redirectPaperEvents() {
		const paper = this.paper;

		["mousewheel"].forEach(event => {
			(function (event) {
				paper.on("cell:" + event, function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
					cellView.model.trigger(event, cellView, evt, x, y, delta);
				});
			})(event);
		});
		["pointerdblclick", "pointerclick", "contextmenu", "pointerdown", "pointermove", "pointerup"].forEach(event => {
			(function (event) {
				paper.on("cell:" + event, function (cellView: dia.CellView, evt: Event, x: number, y: number) {
					cellView.model.trigger(event, cellView, evt, x, y);
				});
			})(event);
		});
		["mouseover", "mouseout", "mouseenter", "mouseleave"].forEach(event => {
			(function (event) {
				paper.on("cell:" + event, function (cellView: dia.CellView, evt: Event) {
					cellView.model.trigger(event, cellView, evt);
				});
			})(event);
		});
	}

	protected addZooming(speed = 0.1, min = 0.5, max = 2.5) {
		const that = this;
		const paper = this.paper;
		const zoom = function (x: number, y: number, delta: number) {
			const scale = paper.scale();
			const oldScale = scale.sx;

			let newScale = oldScale + oldScale * delta * speed;
			if (newScale < min) {
				newScale = min;
			}
			if (newScale > max) {
				newScale = max;
			}

			paper.scale(newScale, newScale);

			const translation = paper.translate();
			const [px, py] = [translation.tx, translation.ty];
			const deltaPx = x * (oldScale - newScale);
			const deltaPy = y * (oldScale - newScale);

			paper.translate(px + deltaPx, py + deltaPy);

			that.positionChanged.next();
		};

		paper.on("blank:mousewheel", function (evt: Event, x: number, y: number, delta: number) {
			zoom(x, y, delta);
		});
		paper.on("cell:mousewheel", function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
			zoom(x, y, delta);
		});
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
			if (panning) {
				paper.translate(x - startX, y - startY);
				that.positionChanged.next();
			}
		};

		paper.on("blank:pointerdown", function (evt: Event, x: number, y: number) {
			startPanning(x, y);
		});
		paper.on("cell:pointerdown", function (cellView: dia.CellView, evt: Event, x: number, y: number) {
			if (cellView.model.attr("draggable") === false) {
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

	protected catchPaperEvents() {
		const paper = this.paper;
		paper.on("blank:mousewheel", function (evt: Event, x: number, y: number, delta: number) {
			evt.preventDefault();
		});
		paper.on("cell:mousewheel", function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
			evt.preventDefault();
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
		return cell;
	}

	public subscribePositionChanged(cb: () => void): void {
		this.positionChanged.subscribe(cb);
	}
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