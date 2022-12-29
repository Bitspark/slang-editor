import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { AppState } from "../state";

export class BlueprintMenu implements ClassComponent<any> {
    private localBlueprints: BlueprintModel[] = []
    private otherBlueprintsByCat = new Map<string, BlueprintModel[]>();

	// @ts-ignore
	public oninit({attrs}: m.Vnode<any, this>) {
        const exclude = attrs.exclude ? attrs.exclude : () => false;
        const blueprints = AppState.blueprints.sort((l, r) => l.name.localeCompare(r.name))
        this.localBlueprints = blueprints.filter(bp => bp.isLocal() && !exclude(bp))

        blueprints.filter(bp => !bp.isLocal()).forEach((bp) => {
            const category = bp.tags[0] || "misc"

            let bpList = this.otherBlueprintsByCat.get(category)

            if (!bpList) {
                bpList = []
            }

            bpList.push(bp)
            this.otherBlueprintsByCat.set(category, bpList)
        })

	}

	public view({attrs}: CVnode<any>) {
        
		return m(".sle-comp__blueprint-menu", attrs,
            m(".menu",
                m("p.menu-label", "Your Blueprints"),
                m("ul.menu-list", this.localBlueprints.map(
                    bp => m("li", m("a",
                    {
                        onclick() {
                            attrs.onselect(bp);
                        }
                    }, bp.getShortName())),
                )),

                Array
                    .from(this.otherBlueprintsByCat.entries())
                    .map(([cat, bpList]) => [
                        m("p.menu-label", cat),
                        m("ul.menu-list",
                            bpList.map(bp => m("li", m("a",
                                {
                                    onclick() {
                                        attrs.onselect(bp);
                                    }
                                }, bp.getShortName())))
                        )
                    ])
            )
        )
	}
}