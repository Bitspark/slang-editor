import m from "mithril";

import {FloatingHtmlElement} from "../../../slang/ui/components/base";
import {OperatorBoxComponent} from "../../../slang/ui/components/blackbox";
import {UserEvent} from "../../../slang/ui/views/user-events";
import {WhiteBoxComponent} from "../../../slang/ui/components/whitebox";

export class ContextMenu {
    private static contextMenu?: FloatingHtmlElement;

    public static show2(event: UserEvent, comp: m.Component) {
        const paperView = event.target!.paperView;
        this.contextMenu = new FloatingHtmlElement(paperView, {...event.xy, align: "tl"}).mount(comp)
        return;
    }

    public static show(cellComp: OperatorBoxComponent | WhiteBoxComponent , comp: m.Component) {
        this.contextMenu = cellComp
            .createComponent({x: 0, y: 0, align: "tl"})
            .attachTo(cellComp.getShape(), "tr")
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
