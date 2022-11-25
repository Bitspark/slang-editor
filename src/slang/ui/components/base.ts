import {dia} from "jointjs";
import m from "mithril";

import {SlangSubject} from "../../core/abstract/utils/events";
import {XY} from "../../definitions/api";
import {cssattr, cssobj, CSSType, cssupdate} from "../utils";
import {PaperView} from "../views/paper-view";
import { UserEvent, UserEvents } from "../views/user-events";

export type Alignment = "tl" | "t" | "tr" | "l" | "c" | "r" | "bl" | "b" | "br";

export interface Position extends XY {
	align: Alignment;
}

abstract class Component {
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

export abstract class CellComponent extends Component {
	public readonly userInteracted = new SlangSubject<UserEvent>("user-interacted");

	protected abstract readonly shape: dia.Cell;
	protected abstract readonly cssAttr: string;
	private components: Component[] = [];

	protected constructor(protected readonly paperView: PaperView, xy: XY) {
		super(xy);
	}

	public destroy() {
		super.destroy();
		this.components.forEach((c) => {
			c.destroy();
		});
		this.components = [];
		this.shape.remove();
	}

	public createComponent(offset: Position): AttachableComponent {
		const comp = new AttachableComponent(this.paperView, offset);
		this.addComponent(comp);
		return comp;
	}

	public addComponent(comp: Component) {
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

abstract class HtmlComponent extends Component {
	private static createRoot(): HTMLElement {
		const el = document.createElement("div");
		el.style.position = "absolute";
		return el;
	}

	protected readonly htmlRoot: HTMLElement;
	protected readonly align: Alignment;

	protected constructor(protected paperView: PaperView, position: Position) {
		super(position);
		this.align = position.align;
		this.htmlRoot = HtmlComponent.createRoot();
		this.paperView.rootEl.appendChild(this.htmlRoot);
		this.paperView.subscribePositionChanged(() => {
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
		return this.paperView.toBrowserXY(this.position);
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

export class AttachableComponent extends HtmlComponent {
	public constructor(paperView: PaperView, offset: Position) {
		super(paperView, offset);
	}

	public attachTo(elem: dia.Element, align?: Alignment) {
		this.update(elem, align);
		elem.on("change:position change:size", () => {
			this.update(elem, align);
		});
		return this;
	}

	protected update(elem: dia.Element, align?: Alignment) {
		const bbox = elem.getBBox();
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
