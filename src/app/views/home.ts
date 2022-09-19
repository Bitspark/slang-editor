import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { AppState } from "../state";

export class HomeView implements ClassComponent<any> {
    private localBlueprints: BlueprintModel[] = []

	// @ts-ignore
	public oninit(vnode: m.Vnode<any, this>) {
        this.localBlueprints = AppState.blueprints.filter(bp => bp.isLocal() && bp.uuid !== AppState.currentBlueprint!.uuid)
	}

	// @ts-ignore
    public oncreate(vnode: m.VnodeDOM<any, this>) {
    }

	// @ts-ignore
	public view({attrs}: CVnode<any>) {
        const localBlueprints = this.localBlueprints;
        return m(".panel",
            m(".panel-heading", `Blueprints (${localBlueprints.length})`),
            m("a.panel-block", {
                onclick:() => AppState.createEmptyBlueprint().open()
            }, [m("span.panel-icon", m("i.fas.fa-plus")), "New Blueprint"]),
            localBlueprints.map(bp => m("a.panel-block", {
                onclick: () => bp.open()
            },
            [m("span.panel-icon", m("i.fas.fa-circle")), bp.getShortName()])
            )
        )
}
}