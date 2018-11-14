import {dia, g, shapes} from 'jointjs';
import {PaperView} from "../views/paper-view";

export interface AnchorPosition extends g.PlainPoint {
}

export abstract class AnchorComponent {
	protected readonly htmlRoot: HTMLElement;
	protected readonly graph: dia.Graph;
	private readonly paper: dia.Paper;

	protected constructor(private readonly paperView: PaperView, private position: AnchorPosition) {
		this.paper = paperView.getPaper();
		this.graph = this.paperView.getGraph();

		const frame = this.paperView.getFrame();

		this.htmlRoot = AnchorComponent.createRoot();
		frame.getHTMLElement().appendChild(this.htmlRoot);

		this.draw();
		this.paperView.subscribePositionChanged(() => {
			this.draw()
		});
	}

	protected destroy() {
		this.htmlRoot.remove();
	}

	protected updatePosition(position: AnchorPosition) {
		this.position = position;
		this.draw();
	}

	private static createRoot(): HTMLElement {
		const el = document.createElement('div');
		el.style.position = "absolute";
		return el;
	}

	private draw() {
		const p = this.convertToClientPoint(this.position);
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
