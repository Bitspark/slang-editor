import m from "mithril";

import {BoxCanvasElement, FloatingHtmlElement, ShapeCanvasElement} from "../../../slang/ui/elements/base";
import {UserEvent} from "../../../slang/ui/canvas/user-events";

export class ContextMenu {
    private static contextMenu?: FloatingHtmlElement;

    public static show2(event: UserEvent, comp: m.Component) {
        const paperView = event.target!.paperView;
        this.contextMenu = new FloatingHtmlElement(paperView, {...event.xy, align: "tl"}).mount(comp)
        return;
    }

    public static show(el: ShapeCanvasElement, comp: m.Component) {
        this.contextMenu = el
            .createComponent({x: 0, y: 0, align: "tl"})
            .mount(comp)

        if (el instanceof BoxCanvasElement) {
           this.contextMenu
               .attachTo(el, "tr")
        }
    }

    public static hide() {
        if (!this.contextMenu) {
            return;
        }
        this.contextMenu.destroy();
        this.contextMenu = undefined;
    }

}