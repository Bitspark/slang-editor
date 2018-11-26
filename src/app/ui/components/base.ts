import m, {CVnode, Vnode} from "mithril";
import {dia, g} from "jointjs";
import {PaperView} from "../views/paper-view";
import {ClassComponent} from "mithril";


export type Alignment =
	"tl" | "t" | "tr" |
	"l" | "c" | "r" |
	"bl" | "b" | "br";

export interface XY extends g.PlainPoint {
}

export interface Position extends XY {
	align: Alignment;
}

export abstract class Component {
	protected readonly graph: dia.Graph;
	private readonly paper: dia.Paper;

	protected constructor(protected readonly paperView: PaperView, private xy: XY) {
		this.graph = this.paperView.getGraph();
		this.paper = this.paperView.getPaper();
	}

	public destroy() {
	}

	public createComponent(offset: Position): AttachedComponent {
		return new AttachedComponent(this.paperView, offset);
	}

	protected getXY(): XY {
		return this.xy;
	}


	protected getClientXY(): XY {
		return this.paper.localToClientPoint(this.xy);
	}

	protected updateXY({x, y}: XY) {
		this.xy = {x, y};
	}
}

export abstract class AnchoredComponent extends Component {
	protected readonly htmlRoot: HTMLElement;
	protected readonly align: Alignment;


	protected constructor(paperView: PaperView, position: Position) {
		super(paperView, position);
		this.align = position.align;
		this.htmlRoot = AnchoredComponent.createRoot();
		this.paperView.getFrame().getHTMLElement().appendChild(this.htmlRoot);
		this.paperView.subscribePositionChanged(() => {
			this.draw();
		});
	}

	public destroy() {
		super.destroy();
		this.htmlRoot.remove();
	}

	protected updateXY(xy: XY) {
		super.updateXY(xy);
		this.draw();
	}

	private static createRoot(): HTMLElement {
		const el = document.createElement("div");
		el.style.position = "absolute";
		return el;
	}

	private hasMountedElement(): boolean {
		return !!this.htmlRoot.innerHTML;
	}

	protected draw() {
		if (!this.hasMountedElement()) {
			return;
		}

		const {x, y} = this.getClientXY();
		const align = this.align;

		let top, left;

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

	public mount(mComp: m.Component): this {
		this.unmount();

		m.mount(this.htmlRoot, {
			view: () => {
				return m(".sl-container", m(mComp));
			}
		});

		this.draw();
		return this;
	}

	public unmount(): this {
		this.htmlRoot.innerHTML = "";
		return this;
	}
}

export class AttachedComponent extends AnchoredComponent {
	public constructor(paperView: PaperView, private offset: Position) {
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

