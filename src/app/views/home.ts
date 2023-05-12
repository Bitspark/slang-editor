import m, {ClassComponent, CVnode} from "mithril";
import { AppState } from "../state";
import {TextWithCopyButton} from "../components/toolkit/text-with-copy-button";
import {SlangFileJson} from "../../slang/definitions/api";

function upload(file: File) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        const contents = e.target!.result;
        const slangFile = JSON.parse(contents as string) as SlangFileJson
        const bp = await AppState.importSlangFile(slangFile)
        console.log("Uploaded", bp.uuid, bp.name)
        m.redraw()
    };
    reader.readAsText(file);
}

export class HomeView implements ClassComponent<any> {
    //private localBlueprints: BlueprintModel[] = []

	// @ts-ignore
	public oninit(vnode: m.Vnode<any, this>) {
        //this.localBlueprints = AppState.blueprints.filter(bp => bp.isLocal())
	}

	// @ts-ignore
    public oncreate(vnode: m.VnodeDOM<any, this>) {
    }

	// @ts-ignore
	public view({attrs}: CVnode<any>) {
        const localBlueprints = AppState.blueprints
            .filter(bp => bp.isLocal())
            .sort((l, r) => l.name.localeCompare(r.name));
        return m("section.section.sle-view__blueprint-overview", m(".container",
            m(".columns",
                m(".column",
                    m(".file.is-boxed.is-fullwidth",
                        m("label.file-label",
                            m("input.file-input", {
                                type: "button",
                                onclick: () => m.route.set("/:uuid", {uuid: AppState.createEmptyBlueprint().uuid})
                            }),
                            m("span.file-cta",
                                m("span.file-icon", m("i.fas.fa-plus")),
                                m("span.file-label.has-text-centered", "New Blueprint"),
                            )
                        )
                    )
                ),
                m(".column",
                    m(".file.is-boxed.is-fullwidth", {
                            // @ts-ignore
                            onchange: (event) => upload(event.target.files[0]),
                        },
                        m("label.file-label",
                            m("input.file-input", {type: "file"}),
                            m("span.file-cta",
                                m("span.file-icon", m("i.fas.fa-upload")),
                                m("span.file-label.has-text-centered", "Upload Blueprints"),
                            )
                        )
                    )
                ),
            ),
            m(".panel",
                m(".panel-heading", `Blueprints (${localBlueprints.length})`),

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
                            m("", m(TextWithCopyButton, {class: "is-small ctrl-bar__uuid"}, bp.uuid))
                        ])
                    ]
                    )
                )
        )));
    }
}