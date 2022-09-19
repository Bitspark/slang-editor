import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { AppState } from "../state";

export class BlueprintMenu implements ClassComponent<any> {
    private localBlueprints: BlueprintModel[] = []
    private otherBlueprints: BlueprintModel[] = []

	// @ts-ignore
	public oninit(vnode: m.Vnode<any, this>) {
        this.localBlueprints = AppState.blueprints.filter(bp => bp.isLocal() && bp.uuid !== AppState.currentBlueprint!.uuid)
        this.otherBlueprints = AppState.blueprints.filter(bp => !bp.isLocal())
	}

	public view({attrs}: CVnode<any>) {
        
		return m(".menu.sle-comp__blueprint-menu", attrs,
            m("p.menu-label", "Your Blueprints"),
            m("ul.menu-list", this.localBlueprints.map(
                bp => m("li", m("a",
                {
                    onclick() {
                        attrs.onselect(bp);
                    }
                }, bp.getShortName())),
            )),
            m("p.menu-label", "Shared Blueprints"),
            m("ul.menu-list", this.otherBlueprints.map(
                bp => m("li", m("a",
                {
                    onclick() {
                        attrs.onselect(bp);
                    }
                }, bp.getShortName())),
            )),
        );
	}
}