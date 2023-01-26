import {Canvas} from "./canvas/base";

export class Frame {
	private canvas: Canvas | null = null;
	private readonly viewEl: HTMLElement;

	public constructor(private readonly container: HTMLElement) {
		const viewEl = document.createElement("div");
		viewEl.className = "sl-view";
		viewEl.style.overflow = "hidden";
		viewEl.style.position = "relative";
		container.appendChild(viewEl);
		this.viewEl = viewEl;

		window.addEventListener("resize", () => {
			if (this.canvas) {
				this.canvas.resize(this.container.clientWidth, this.container.clientHeight);
			}
		});
		window.addEventListener("load", () => {
			if (this.canvas) {
				this.canvas.resize(this.container.clientWidth, this.container.clientHeight);
			}
		});
	}

	public setView(view: Canvas) {
		this.canvas = view;
		view.resize(this.container.clientWidth, this.container.clientHeight);
	}

	public getHTMLElement(): HTMLElement {
		return this.viewEl;
	}
}
