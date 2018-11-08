import {dia, shapes} from 'jointjs';
import m from 'mithril';


import {LandscapeModel} from '../../model/landscape';
import {BlueprintModel} from '../../model/blueprint';
import {ClassComponent, CVnode} from "mithril";
import {BlueprintView} from "../views/blueprint";

export interface Attrs {
    pos: [number, number]
    blueprints: Array<BlueprintModel>
}

class BlueprintMenuComponent implements ClassComponent<Attrs> {
    private blueprints: Array<BlueprintModel>;

    // Note that class methods cannot infer parameter types
    oninit({attrs}: CVnode<Attrs>) {
        this.blueprints = attrs.blueprints;
    }

    view({attrs}: CVnode<Attrs>) {
        return m(".sl-blupr-menu", {
                style: {
                    left: `${attrs.pos[0]}px`,
                    top: `${attrs.pos[1]}px`,
                }
            },
            this.blueprints.map((blueprint: BlueprintModel) => {
                return m(".sl-blupr-entry", m(".sl-bluepr-title", blueprint.getFullName()))
            })
        );
    }
}


export class BlueprintSelectComponent {
    private readonly graph: dia.Graph;
    private readonly blueprint: BlueprintModel;
    private readonly landscape: LandscapeModel;
    private readonly placeholderRect: shapes.standard.Rectangle;

    constructor(private readonly blueprintView: BlueprintView, [relX, relY]: [number, number], [absX, absY]: [number, number]) {
        this.graph = blueprintView.getGraph();
        this.blueprint = blueprintView.getBlueprint()
        this.landscape = this.blueprint.getLandscape();

        this.placeholderRect = BlueprintSelectComponent.createPlaceholder(relX, relY);
        this.placeholderRect.addTo(this.graph);

        const el: HTMLElement = document.createElement('span');
        this.blueprintView.getFrame().getHTMLElement().appendChild(el);

        m.mount(el,
            {
                view: () => m(new BlueprintMenuComponent(), {
                    pos: [absX, absY],
                    blueprints: this.getBlueprints()
                })
            }
        );
        this.subscribe();
    }

    public destroy() {
    }

    private subscribe() {
    }


    private getBlueprints(): Array<BlueprintModel> {
        const blueprintsMap = new Map<BlueprintModel, number>();
        for (const op of this.blueprint.getOperators()) {
            const bp = op.getBlueprint();
            const v = blueprintsMap.get(bp);
            const cnt: number = (v) ? v : 0;
            blueprintsMap.set(bp, cnt + 1);
        }

        const blueprints: Array<BlueprintModel> = Array.from(blueprintsMap.entries())
            .sort((a: [BlueprintModel, number], b: [BlueprintModel, number]) => a[1] - b[1])
            .map(([bp, cnt]: [BlueprintModel, number]) => bp);

        for (const bp of this.landscape.getBlueprints()) {
            if (blueprints.length < 10) {
                if (blueprints.indexOf(bp) < 0) {
                    blueprints.push(bp);
                }
            }
        }

        return blueprints;
    }

    private static createPlaceholder(posX: number, posY: number): shapes.standard.Rectangle {
        const phRect = new shapes.standard.Rectangle({
            size: {width: 100, height: 100},
            position: {x: posX - 50, y: posY - 50},
            attrs: {
                root: {},
                body: {
                    fill: "transparent",
                    stroke: "black",
                    strokeWidth: "1",
                    rx: 8,
                    ry: 8,
                },
                label: {
                    text: "• • •",
                    fill: "black",
                },
            },
        });
        phRect.attr("draggable", false);
        return phRect;
    }
}
