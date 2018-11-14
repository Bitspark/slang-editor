import {dia, g, shapes} from 'jointjs';
import {PaperView} from "../views/paper-view";

export interface AnchorPosition extends g.PlainPoint {
}

export abstract class AnchorComponent {
	protected readonly htmlRoot: HTMLElement;
	protected readonly graph: dia.Graph;
	protected readonly anchor: dia.Element;
	private readonly paper: dia.Paper;

	protected constructor(private readonly paperView: PaperView, private pos: [number, number]) {
		this.paper = paperView.getPaper();
		this.graph = this.paperView.getGraph();

		const frame = this.paperView.getFrame();

		this.htmlRoot = AnchorComponent.createRoot();
		frame.getHTMLElement().appendChild(this.htmlRoot);
		this.anchor = new shapes.basic.Rect({
			position: {
				x: pos[0], y: pos[1]
			},
			size: {
				width: 0, height: 0
			}
		});
		this.anchor.set('draggable', false);
		this.anchor.addTo(this.graph);

		//this.draw();

		const that = this;
		this.paperView.subscribePositionChanged(function () {
			that.draw()
		});
		this.anchor.on("change:position change:size", function () {
			that.draw();
		});
	}

	protected destroy() {
		this.anchor.remove();
		this.htmlRoot.remove();
	}

	protected updatePosition({x, y}: AnchorPosition) {
		this.anchor.position(x, y);
	}

	private static createRoot(): HTMLElement {
		const el = document.createElement('div');
		el.style.position = "absolute";
		return el;
	}

	private draw() {
		const p = this.convertToClientPoint(this.anchor.position());
		this.htmlRoot.style.left = `${p.x}px`;
		this.htmlRoot.style.top = `${p.y}px`;
	}

	private convertToClientPoint(p: g.PlainPoint): AnchorPosition {
		return this.paper.localToClientPoint(p);
	}

	private convertToPaperPoint({x, y}: AnchorPosition): g.Point {
		return this.paper.clientToLocalPoint(x, y);
	}

}
