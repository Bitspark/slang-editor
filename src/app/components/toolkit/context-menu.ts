import m from "mithril";

import {AttachableComponent} from "../../../slang/ui/components/base";
import {OperatorBoxComponent} from "../../../slang/ui/components/blackbox";
import {UserEvent} from "../../../slang/ui/views/user-events";

export class ContextMenu {
    private static contextMenu?: AttachableComponent;

    public static show2(event: UserEvent, comp: m.Component) {
        const paperView = event.target!.paperView;
        this.contextMenu = new AttachableComponent(paperView, {...event.xy, align: "tl"}).mount(comp)
        return;
    }

    public static show(oprBox: OperatorBoxComponent, comp: m.Component) {
        this.contextMenu = oprBox
            .createComponent({x: 0, y: 0, align: "tl"})
            .attachTo(oprBox.getShape(), "tr")
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