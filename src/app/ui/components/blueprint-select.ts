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

    public getAnchor(): HTMLElement {
        return this.el;
    }

    protected lockAnchorPosition() {
        const paper = this.blueprintView.getPaper();

        let panning = false;
        let diffToAnchorX: number = 0;
        let diffToAnchorY: number = 0;

        const that = this;
        const anchor = that.getAnchor();
        const startPanning = function (x: number, y: number) {
            diffToAnchorX = x - anchor.offsetLeft;
            diffToAnchorY = y - anchor.offsetTop;
            panning = true;
        };

        const stopPanning = function () {
            panning = false;
        };

        const doPanning = function (x: number, y: number) {
            if (panning) {
                const newX = x - diffToAnchorX;
                const newY = y - diffToAnchorY;
                anchor.style.left = `${Math.floor(newX)}px`;
                anchor.style.top = `${Math.floor(newY)}px`;
            }
        };

        paper.on('blank:pointerdown', function (evt: JQueryMouseEventObject, x: number, y: number) {
            startPanning(evt.offsetX, evt.offsetY);
        });
        paper.on('cell:pointerdown', function (cellView: dia.CellView, evt: JQueryMouseEventObject, x: number, y: number) {
            startPanning(evt.offsetX, evt.offsetY);
        });
        paper.on('blank:pointerup', function (evt: Event, x: number, y: number) {
            stopPanning();
        });
        paper.on('cell:pointerup', function (cellView: dia.CellView, evt: Event, x: number, y: number) {
            stopPanning();
        });
        paper.svg.addEventListener('mousemove', function (event: any) {
            doPanning(event.offsetX, event.offsetY);
        });
    }

    private subscribe() {
        this.lockAnchorPosition()
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
