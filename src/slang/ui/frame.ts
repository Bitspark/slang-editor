import {View} from "./views/view";

export class ViewFrame {
	private view: View | null = null;
	private readonly viewEl: HTMLElement;

	public constructor(private readonly container: HTMLElement) {
		const viewEl = document.createElement("div");
		viewEl.className = "sl-view";
		viewEl.style.overflow = "hidden";
		viewEl.style.position = "relative";
		container.appendChild(viewEl);
		this.viewEl = viewEl;

		window.addEventListener("resize", () => {
			if (this.view) {
				this.view.resize(this.container.clientWidth, this.container.clientHeight);
			}
		});
		window.addEventListener("load", () => {
			if (this.view) {
				this.view.resize(this.container.clientWidth, this.container.clientHeight);
			}
		});
	}

	public setView(view: View) {
		this.view = view;
		view.resize(this.container.clientWidth, this.container.clientHeight);
	}

	public getHTMLElement(): HTMLElement {
		return this.viewEl;
	}
}
