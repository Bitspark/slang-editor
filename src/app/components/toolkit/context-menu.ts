import m from "mithril";

import {FloatingHtmlElement} from "../../../slang/ui/elements/base";
import {InteractableDiaElement, UserEvent} from "../../../slang/ui/canvas/user-events";
import {OperatorBox} from "../../../slang/ui/elements/operator";
import {BlueprintBox} from "../../../slang/ui/elements/blueprint";
import {BlueprintPortElement} from "../../../slang/ui/elements/blueprint-port";

export class ContextMenu {
    private static contextMenu?: FloatingHtmlElement;

    public static show2(event: UserEvent, comp: m.Component) {
        const paperView = event.target!.paperView;
        this.contextMenu = new FloatingHtmlElement(paperView, {...event.xy, align: "tl"}).mount(comp)
        return;
    }

    public static show(box: InteractableDiaElement, comp: m.Component) {
        this.contextMenu = box
            .createComponent({x: 0, y: 0, align: "tl"})

        if (box instanceof OperatorBox || box instanceof BlueprintBox || box instanceof BlueprintPortElement) {
           this.contextMenu
               .attachTo(box.getShape(), "tr")
        }

       this.contextMenu
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