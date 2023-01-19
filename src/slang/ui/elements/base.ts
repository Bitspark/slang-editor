import m from "mithril";
import {dia} from "jointjs";

import {SlangSubject} from "../../core/abstract/utils/events";
import {XY} from "../../definitions/api";
import {cssattr, cssobj, CSSType, cssupdate} from "../utils";
import {Canvas} from "../canvas/base";
import {UserEvent, UserEvents} from "../canvas/user-events";

export type Alignment = "tl" | "t" | "tr" | "l" | "c" | "r" | "bl" | "b" | "br";

export interface Position extends XY {
	align: Alignment;
}

abstract class CanvasElement {
	protected constructor(private svgXY: XY) {}

	public destroy() {
		return;
	}

	protected updateXY({x, y}: XY) {
		this.svgXY = {x, y};
	}

	protected get position(): XY {
		return this.svgXY;
	}
}

export abstract class ShapeCanvasElement extends CanvasElement {
	public readonly userInteracted = new SlangSubject<UserEvent>("user-interacted");
	private components: CanvasElement[] = [];

	protected abstract readonly cssAttr: string;
	protected abstract readonly shape: dia.Cell;

	protected constructor(public readonly paperView: Canvas, xy: XY) {
		super(xy);
	}

	public onUserEvent(cb: (e: UserEvent) => void) {
		this.userInteracted.subscribe((event) => {
			event.target = this
			cb(event);
		});
	}

	public destroy() {
		super.destroy();
		this.components.forEach((c) => {
			c.destroy();
		});
		this.components = [];
		this.shape.remove();
	}

	public createComponent(offset: Position): FloatingHtmlElement {
		const comp = new FloatingHtmlElement(this.paperView, offset);
		this.addComponent(comp);
		return comp;
	}

	public addComponent(comp: CanvasElement) {
		this.components.push(comp);
	}

	public render() {
		// @ts-ignore
		this.shape.on("pointerclick", (_cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
			this.userInteracted.next(UserEvents.pointerClick({event, xy: {x, y}}));
		});
		// @ts-ignore
		this.shape.on("pointerdblclick", (_cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
			this.userInteracted.next(UserEvents.pointerDbclick({event, xy: {x, y}}));
		});
		// @ts-ignore
		this.shape.on("contextmenu", (_cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
			this.userInteracted.next(UserEvents.contextmenu({event, xy: {x, y}}));
		});

		this.paperView.renderCell(this.shape);
	}

	public getShape(): dia.Cell {
		return this.shape;
	}

	public css(css: CSSType): void {
		const origCSS = cssobj(this.shape.attr(this.cssAttr));
		const newcss = cssupdate(origCSS, css);
		this.shape.removeAttr(this.cssAttr);
		this.shape.attr(this.cssAttr, cssattr(newcss));
	}
}

export abstract class BoxCanvasElement extends ShapeCanvasElement {
	protected abstract readonly shape: dia.Element;

	public getShape(): dia.Element {
		return this.shape;
	}
}

abstract class HtmlCanvasElement extends CanvasElement {
	private static createRoot(): HTMLElement {
		const el = document.createElement("div");
		el.style.position = "absolute";
		return el;
	}

	protected readonly htmlRoot: HTMLElement;
	protected readonly align: Alignment;

	protected constructor(protected canvas: Canvas, position: Position) {
		super(position);
		this.align = position.align;
		this.htmlRoot = HtmlCanvasElement.createRoot();
		this.canvas.rootEl.appendChild(this.htmlRoot);
		this.canvas.subscribePositionChanged(() => {
			this.draw();
		});
	}

	public destroy() {
		super.destroy();
		this.unmount();
		this.htmlRoot.remove();
	}

	public mount(component: m.Component): this {
		this.unmount();

		m.mount(this.htmlRoot, {
			oncreate: () => {
				this.draw();
			},
			onupdate: () => {
				this.draw();
			},
			view: () => {
				return m("", m(component));
			},
		});
		return this;
	}

	public unmount(): this {
		m.mount(this.htmlRoot, null);
		return this;
	}

	protected getBrowserXY(): XY {
		return this.canvas.toBrowserXY(this.position);
	}

	protected updateXY(xy: XY) {
		super.updateXY(xy);
		this.draw();
	}

	protected draw() {
		const {x, y} = this.getBrowserXY();
		const align = this.align;

		let top;
		let left;

		const v = align[0];
		const h = align.slice(-1);

		switch (h) {
			case "l":
				left = x;
				break;
			case "t":
			case "c":
			case "b":
				left = x - this.htmlRoot.offsetWidth / 2;
				break;
			case "r":
				left = x - this.htmlRoot.offsetWidth;
				break;
		}

		switch (v) {
			case "t":
				top = y;
				break;
			case "l":
			case "c":
			case "r":
				top = y - this.htmlRoot.offsetHeight / 2;
				break;
			case "b":
				top = y - this.htmlRoot.offsetHeight;
				break;
		}

		this.htmlRoot.style.top = `${top}px`;
		this.htmlRoot.style.left = `${left}px`;
	}
}


export class FloatingHtmlElement extends HtmlCanvasElement {
	public constructor(paperView: Canvas, offset: Position) {
		super(paperView, offset);
	}

	public attachTo(box: BoxCanvasElement, align?: Alignment) {
		this.update(box, align);
		box.getShape().on("change:position change:size", () => {
			this.update(box, align);
		});
		return this;
	}

	protected update(box: BoxCanvasElement, align?: Alignment) {
		const bbox = box.getShape().getBBox();
		let originPos = bbox.center();

		switch (align) {
			case "tl":
				originPos = bbox.topLeft();
				break;
			case "t":
				originPos = bbox.topMiddle();
				break;
			case "tr":
				originPos = bbox.topRight();
				break;

			case "l":
				originPos = bbox.leftMiddle();
				break;
			case "c":
				break;
			case "r":
				originPos = bbox.rightMiddle();
				break;

			case "bl":
				originPos = bbox.bottomLeft();
				break;
			case "b":
				originPos = bbox.bottomMiddle();
				break;
			case "br":
				originPos = bbox.bottomRight();
				break;
		}

		super.updateXY(originPos);
	}
}
