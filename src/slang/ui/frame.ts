import {ComponentFactory} from "./factory";
import {View} from "./views/view";

export interface IView {
	resize(width: number, height: number): void;
}

export class ViewFrame {

	private view: IView | null = null;
	private readonly viewEl: HTMLElement;

	public constructor(private readonly container: HTMLElement, private readonly factory: ComponentFactory) {
		this.viewEl = document.createElement("div");
		this.viewEl.classList.add("view");
		container.appendChild(this.viewEl);

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

	public getFactory(): ComponentFactory {
		return this.factory;
	}

}
