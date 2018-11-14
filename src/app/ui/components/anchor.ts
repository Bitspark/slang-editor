import m, {CVnodeDOM} from 'mithril';
import {dia, g} from 'jointjs';

import {ClassComponent, CVnode} from "mithril";
import {PaperView} from "../views/paper-view";

export class AnchorComponent {
	private readonly anchorEl: HTMLElement;
	private readonly paper: dia.Paper;

	constructor(private readonly paperView: PaperView, private readonly attachedElement: dia.Element) {
		this.paper = paperView.getPaper();
		this.anchorEl = this.createRoot();
		this.updateAnchorPosition(attachedElement.position());
		m.mount(this.anchorEl, AnchorComponent.Anchor);
	}

	private createRoot(): HTMLElement {
		const el = document.createElement('div');
		el.style.position = "absolute";
		el.style.height = "1px";
		el.style.width = "1px";
		el.style.background = "#f400a1";
		el.style.border = "1px solid #f400a1";
		this.paperView.getFrame().getHTMLElement().appendChild(el);
		return el;
	}

	private updateAnchorPosition(localP: g.PlainPoint) {
		const clientP = this.convertToClientPoint(localP);
		this.anchorEl.style.left = `${clientP.x}px`;
		this.anchorEl.style.top = `${clientP.y}px`;
	}

	private convertToClientPoint(p: g.PlainPoint): g.PlainPoint {
		return this.paper.localToClientPoint(p);
	}

	private convertToPaperPoint({x, y}: g.PlainPoint): g.Point {
		return this.paper.clientToLocalPoint(x, y);
	}


}

export namespace AnchorComponent {
	export interface Attrs {
	}

	export class Anchor implements ClassComponent<AnchorComponent.Attrs> {
		private el: HTMLElement;

		view(v: CVnode<AnchorComponent.Attrs>) {
		}
	}
}

