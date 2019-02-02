import {dia} from "jointjs";
import m from "mithril";

import {XY} from "../../core/model/operator";
import {PaperView} from "../views/paper-view";
import {Tk} from "./toolkit";

import Container = Tk.Container;

export type Alignment =
	"tl" | "t" | "tr" |
	"l" | "c" | "r" |
	"bl" | "b" | "br";

export interface Position extends XY {
	align: Alignment;
}

abstract class Component {
	protected constructor(private xy: XY) {
	}

	public destroy() {
	}

	protected updateXY({x, y}: XY) {
		this.xy = {x, y};
	}

	protected get position(): XY {
		return this.xy;
	}
}

export abstract class CellComponent extends Component {
	protected abstract readonly shape: dia.Cell;
	private components: Component[] = [];

	protected constructor(protected readonly paperView: PaperView, xy: XY) {
		super(xy);
	}

	public destroy() {
		super.destroy();
		this.components.forEach((c) => c.destroy());
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
		this.paperView.renderCell(this.shape);
	}

	public getShape(): dia.Cell {
		return this.shape;
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
		this.paperView.getFrame().getHTMLElement().appendChild(this.htmlRoot);
		this.paperView.subscribePositionChanged(() => {
			this.draw();
		});
	}

	public destroy() {
		super.destroy();
		this.htmlRoot.remove();
	}

	public mount(component: m.Component): this {
		this.unmount();

		const paper = this.paperView.getPaper();

		m.mount(this.htmlRoot, {
			oncreate: () => {
				this.draw();
			},
			onupdate: () => {
				this.draw();
			},
			view: () => {
				return m(Container, {
						onmousewheel: (e: WheelEvent) => {
							e.preventDefault();
							e.stopPropagation();
							const {x, y} = paper.clientToLocalPoint(e.clientX, e.clientY);
							// jointjs uses JqueryEventObjects --> paper.on expect JqueryEvents instead of standard DOM events
							paper.trigger("blank:mousewheel", {originalEvent: e}, x, y);
						},
					},
					m(component));
			},
		});
		return this;
	}

	public unmount(): this {
		this.htmlRoot.innerHTML = "";
		return this;
	}

	protected getClientXY(): XY {
		return this.paperView.toClientXY(this.position);
	}

	protected updateXY(xy: XY) {
		super.updateXY(xy);
		this.draw();
	}

	protected draw() {
		const {x, y} = this.getClientXY();
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
				left = x - (this.htmlRoot.offsetWidth / 2);
				break;
			case "r":
				left = x - (this.htmlRoot.offsetWidth);
				break;
		}

		switch (v) {
			case "t":
				top = y;
				break;
			case "l":
			case "c":
			case "r":
				top = y - (this.htmlRoot.offsetHeight / 2);
				break;
			case "b":
				top = y - (this.htmlRoot.offsetHeight);
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
