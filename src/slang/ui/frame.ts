import {SlangAspects} from "../aspects";

import {View} from "./views/view";

export class ViewFrame {

	private view: View | null = null;
	private readonly viewEl: HTMLElement;

	public constructor(private readonly container: HTMLElement, protected readonly aspects: SlangAspects) {
		this.viewEl = document.createElement("div");
		this.viewEl.classList.add("sl-view");
		container.appendChild(this.viewEl);
		container.style.overflow = "hidden";
		container.style.position = "relative";

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

	public getView(): View | null {
		return this.view;
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
