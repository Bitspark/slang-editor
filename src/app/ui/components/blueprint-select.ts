import {dia, shapes} from 'jointjs';
import m, {CVnodeDOM} from 'mithril';


import {LandscapeModel} from '../../model/landscape';
import {BlueprintModel} from '../../model/blueprint';
import {ClassComponent, CVnode} from "mithril";
import {BlueprintView} from "../views/blueprint";
import {Geometry} from "../../model/operator";
import {BlackBoxComponent, BlueprintBoxComponent} from "./blackbox";

export interface Attrs {
    onSelect: (bp: BlueprintModel) => void,
    onHover: (bp?: BlueprintModel) => void,
    blueprints: Array<BlueprintModel>
}

class BlueprintMenuComponent implements ClassComponent<Attrs> {
    private blueprints: Array<BlueprintModel>;

    // Note that class methods cannot infer parameter types
    oninit({attrs}: CVnode<Attrs>) {
        this.blueprints = attrs.blueprints;
    }

    onbeforeupdate(vnode: CVnode<Attrs>, old: CVnodeDOM<Attrs>): boolean | void {
        return false;
    }

    view({attrs}: CVnode<Attrs>) {
        return m(".sl-blupr-menu", {
                onmouseleave: () => {
                    attrs.onHover(undefined);
                }
            },
            this.blueprints.map((blueprint: BlueprintModel) => {
                return m(".sl-blupr-entry", {
                        onclick: () => {
                            attrs.onSelect(blueprint);
                        },
                        onmouseenter: () => {
                            attrs.onHover(blueprint);
                        },
                    },
                    m(".sl-bluepr-title", blueprint.getFullName()))
            })
        );
    }
}


export class BlueprintSelectComponent {
    private readonly graph: dia.Graph;
    private readonly blueprint: BlueprintModel;
    private readonly landscape: LandscapeModel;
    private ghostRect: shapes.standard.Rectangle | BlackBoxComponent.Rectangle;
    private readonly el: HTMLElement;
    private readonly blueprintMenu: BlueprintMenuComponent;

    constructor(private readonly blueprintView: BlueprintView, private relPos: [number, number], private readonly absPos: [number, number]) {
        this.graph = blueprintView.getGraph();
        this.blueprint = blueprintView.getBlueprint()
        this.landscape = this.blueprint.getLandscape();

        this.placeGhostRect([relPos[0] - 50, relPos[1] - 50]);

        this.el = document.createElement('div');
        this.el.style.position = 'absolute';
        this.el.style.left = `${absPos[0]}px`;
        this.el.style.top = `${absPos[1]}px`;
        this.blueprintView.getFrame().getHTMLElement().appendChild(this.el);

        this.blueprintMenu = new BlueprintMenuComponent();

        m.render(this.el,
            m(this.blueprintMenu, {
                blueprints: this.getBlueprints(),
                onSelect: (bp: BlueprintModel) => {
                    const pos = this.ghostRect.position();
                    const geo: Geometry = {
                        position: [pos.x, pos.y]
                    };
                    this.blueprint.createBlankOperator(bp, geo);
                    this.destroy();
                },
                onHover: (bp?: BlueprintModel) => {
                    const pos = this.ghostRect.position();
                    this.placeGhostRect([pos.x, pos.y], bp)
                }
            })
        );
        this.subscribe();
    }

    public destroy() {
        this.ghostRect.remove();
        this.el.remove();
    }

    private subscribe() {
        const that = this;
        this.placeholderRect.on("change:position", function (elem: dia.Element) {
            console.log(">>>", elem, elem.getBBox());
            that.moveTo([elem.getBBox().x, elem.getBBox().y]);
        });
    }

    private moveTo(relPos: [number, number]) {
        this.relPos = relPos;
        const distance = [
            this.relPos[0] - relPos[0],
            this.relPos[1] - relPos[1],
        ];
        this.absPos[0] = this.absPos[0] - distance[0];
        this.absPos[1] = this.absPos[1] - distance[1];
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

    private placeGhostRect([posX, posY]: [number, number], blueprint?: BlueprintModel) {
        if (this.ghostRect) {
            this.ghostRect.remove();
        }

        if (!blueprint) {
            this.ghostRect = new shapes.standard.Rectangle({
                size: {width: 100, height: 100},
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
            this.ghostRect.attr("draggable", false);
            this.ghostRect.addTo(this.graph);
        } else {
            this.ghostRect = new BlueprintBoxComponent(this.graph, blueprint).getRectangle();
        }
        this.ghostRect.position(posX, posY);
    }
}
