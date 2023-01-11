import m, {ClassComponent, CVnode} from "mithril";
import { BlueprintModel } from "../../slang/core/models";
import { AppState } from "../state";
import {TextWithCopyButton} from "../components/toolkit/text-with-copy-button";

export class HomeView implements ClassComponent<any> {
    private localBlueprints: BlueprintModel[] = []

	// @ts-ignore
	public oninit(vnode: m.Vnode<any, this>) {
        this.localBlueprints = AppState.blueprints.filter(bp => bp.isLocal())
	}

	// @ts-ignore
    public oncreate(vnode: m.VnodeDOM<any, this>) {
    }

	// @ts-ignore
	public view({attrs}: CVnode<any>) {
        const localBlueprints = this.localBlueprints.sort((l, r) => l.name.localeCompare(r.name));
        return m("section.section.sle-view__blueprint-overview", m(".container",
            m(".panel",
                m(".panel-heading", `Blueprints (${localBlueprints.length})`),

                m("a.panel-block", {
                    onclick:() => m.route.set("/:uuid", {uuid: AppState.createEmptyBlueprint().uuid})
                }, [m("span.panel-icon", m("i.fas.fa-plus")), "New Blueprint"]),

                localBlueprints.map(bp =>
                    m("a.panel-block.blueprint", {
                        class: bp.isRunning ? "blueprint--is-running" : "",
                        onclick: () => m.route.set("/:uuid", {uuid: bp.uuid})
                    },
                    [
                        m("span.panel-icon",
                            m("i.fas.fa-circle")
                        ),
                        m("", [
                            bp.name,
                            m(TextWithCopyButton, {class: "is-small ctrl-bar__uuid"}, bp.uuid),
                        ])
                    ]
                    )
                )
        )));
    }
}