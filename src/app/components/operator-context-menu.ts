import m from "mithril";

import { AttachableComponent } from "../../slang/ui/components/base";
import { OperatorBoxComponent } from "../../slang/ui/components/blackbox";

export class ContextMenu {
	private static contextMenu?: AttachableComponent;

	public static show(oprBox: OperatorBoxComponent, comp: m.Component) {
		this.contextMenu = oprBox
		.createComponent({x: 0, y: 0, align: "tl"})
		.attachTo(oprBox, "tr")
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