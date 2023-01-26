import m from "mithril";

import {BoxCanvasElement, FloatingHtmlElement} from "../../../slang/ui/elements/base";
import {UserEvent} from "../../../slang/ui/canvas/user-events";

export class ContextMenu {
    private static contextMenu?: FloatingHtmlElement;

    public static show(event: UserEvent, comp: m.Component) {
        console.assert(!this.contextMenu, "Don't forget to close one context menu before opening another.")

        if (event.target instanceof BoxCanvasElement) {
            this.showNextToBox(event.target, comp)
            return
        }

        this.showAtXY(event, comp)

        return;
    }

    public static showAtXY({target, xy}: UserEvent, comp: m.Component) {
        this.contextMenu = new FloatingHtmlElement(target!.paperView, {...xy, align: "tl"}).mount(comp)
        return;
    }

    private static showNextToBox(el: BoxCanvasElement, comp: m.Component) {
        this.contextMenu = el
            .createComponent({x: 0, y: 0, align: "tl"})
            .attachTo(el, "tr")
            .mount(comp)
    }

    public static hide() {
        if (!this.contextMenu) {
            return;
        }
        this.contextMenu.destroy();
        this.contextMenu = undefined;
    }

}