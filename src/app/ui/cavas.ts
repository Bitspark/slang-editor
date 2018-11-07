import {View} from "./views/view";

export class HTMLCanvas {

    private view: View | null = null;

    public constructor(private readonly container: HTMLElement) {
        const that = this;
        window.addEventListener("resize", function () {
            if (that.view) {
                that.view.resize(that.container.clientWidth, that.container.clientHeight);
            }
        });
        window.addEventListener("load", function () {
            if (that.view) {
                that.view.resize(that.container.clientWidth, that.container.clientHeight);
            }
        });
    }

    public setView(ctor: new(canvas: HTMLCanvas, ...args: any) => View, ...args: any) {
        this.view = new ctor(this, ...args);
        this.view.resize(this.container.clientWidth, this.container.clientHeight);
    }

    public getHTMLElement(): HTMLElement {
        return this.container;
    }

}
