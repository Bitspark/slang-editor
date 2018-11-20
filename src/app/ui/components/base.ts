import m from "mithril";
import {dia, g} from "jointjs";
import {PaperView} from "../views/paper-view";
import {ClassComponent} from "mithril";

export interface AnchorPosition extends g.PlainPoint {
	alignment?:
		"tl" | "t" | "tr" |
		"ml" | "c" | "mr" |
		"bl" | "b" | "br";
}

export abstract class Component {
	protected readonly graph: dia.Graph;
	private readonly paper: dia.Paper;

	protected constructor(private readonly paperView: PaperView, private position: AnchorPosition) {
		this.graph = this.paperView.getGraph();
		this.paper = this.paperView.getPaper();
	}

	protected destroy() {
	}

	protected updatePosition(position: AnchorPosition) {
		if (!position.alignment) {
			position.alignment = "c";
		}
		this.position = position;
	}

	protected getClientPosition(): g.PlainPoint {
		return this.paper.localToClientPoint(this.position);
	}

	public createComponent(offset: AnchorPosition): AttachedComponent {
		return new AttachedComponent(this.paperView, offset);
	}
}

export abstract class AnchoredComponent extends Component {
	protected readonly htmlRoot: HTMLElement;

	protected constructor(paperView: PaperView, position: AnchorPosition) {
		super(paperView, position);
		this.htmlRoot = AnchoredComponent.createRoot();

		paperView.getFrame().getHTMLElement().appendChild(this.htmlRoot);

		this.draw();
		paperView.subscribePositionChanged(() => {
			this.draw();
		});
	}

	protected destroy() {
		super.destroy();
		this.htmlRoot.remove();
	}

	protected updatePosition(position: AnchorPosition) {
		super.updatePosition(position);
		this.draw();
	}

	private static createRoot(): HTMLElement {
		const el = document.createElement("div");
		el.style.position = "absolute";
		el.style.lineHeight = "1px";
		return el;
	}

	private draw() {
		const p = this.getClientPosition();
		this.htmlRoot.style.left = `${p.x}px`;
		this.htmlRoot.style.top = `${p.y}px`;
	}

}

export class AttachedComponent extends AnchoredComponent {
	public constructor(paperView: PaperView, private offset: AnchorPosition) {
		super(paperView, offset);
	}

	public attachTo(elem: dia.Element) {
		this.update(elem);
		elem.on("change:position change:size", () => {
			this.update(elem);
		});
		return this;
	}

	public mount(mComp: ClassComponent) {
		m.mount(this.htmlRoot, mComp);
		return this;
	}


	protected update(elem: dia.Element) {
		const bbox = elem.getBBox();
		let originPos = bbox.center();

		switch (this.offset.alignment) {
			case "tl":
				originPos = bbox.topLeft();
				break;
			case "t":
				originPos = bbox.topMiddle();
				break;
			case "tr":
				originPos = bbox.topRight();
				break;

			case "ml":
				originPos = bbox.leftMiddle();
				break;
			case "c":
				originPos = bbox.center();
				break;
			case "mr":
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

		const pos = originPos;
		super.updatePosition(pos);
	}
}

