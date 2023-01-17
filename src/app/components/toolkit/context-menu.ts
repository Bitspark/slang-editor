import m from "mithril";

import {FloatingHtmlElement} from "../../../slang/ui/elements/base";
import {OperatorBox} from "../../../slang/ui/elements/operator";
import {UserEvent} from "../../../slang/ui/canvas/user-events";
import {BlueprintBox} from "../../../slang/ui/elements/blueprint";

export class ContextMenu {
    private static contextMenu?: FloatingHtmlElement;

    public static show2(event: UserEvent, comp: m.Component) {
        const paperView = event.target!.paperView;
        this.contextMenu = new FloatingHtmlElement(paperView, {...event.xy, align: "tl"}).mount(comp)
        return;
    }

    public static show(box: OperatorBox | BlueprintBox, comp: m.Component) {
        this.contextMenu = box
            .createComponent({x: 0, y: 0, align: "tl"})
            .attachTo(box.getShape(), "tr")
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