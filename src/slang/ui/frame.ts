import {ComponentFactory} from "./factory";
import {View} from "./views/view";

export class ViewFrame {

	private view: View | null = null;
	private readonly viewEl: HTMLElement;

	public constructor(private readonly container: HTMLElement, protected readonly factory: ComponentFactory) {
		this.viewEl = document.createElement("div");
		this.viewEl.classList.add("view");
		container.appendChild(this.viewEl);

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

	public getFactory(): ComponentFactory {
		return this.factory;
	}

	public setView(view: View) {
		this.view = view;
		view.resize(this.container.clientWidth, this.container.clientHeight);
	}

	public getHTMLElement(): HTMLElement {
		return this.viewEl;
	}

}
