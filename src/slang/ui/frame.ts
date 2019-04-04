import {SlangAspects} from "../aspects";

import {View} from "./views/view";

export class ViewFrame {

	private view: View | null = null;
	private readonly viewEl: HTMLElement;

	public constructor(private readonly container: HTMLElement, protected readonly aspects: SlangAspects) {
		this.viewEl = document.createElement("div");
		this.viewEl.classList.add("view");
		container.appendChild(this.viewEl);
		container.style.overflow = "hidden";
		container.style.position = "relative";

		const that = this;
		window.addEventListener("resize", () => {
			if (that.view) {
				that.view.resize(that.container.clientWidth, that.container.clientHeight);
			}
		});
		window.addEventListener("load", () => {
			if (that.view) {
				that.view.resize(that.container.clientWidth, that.container.clientHeight);
			}
		});
	}

	public getAspects(): SlangAspects {
		return this.aspects;
	}

	public setView(view: View) {
		this.view = view;
		view.resize(this.container.clientWidth, this.container.clientHeight);
	}

	public getHTMLElement(): HTMLElement {
		return this.viewEl;
	}

}
