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
    onFilter: (filter: string) => void,
    onLoad: () => Array<BlueprintModel>
}

export interface MithrilMouseEvent extends MouseEvent {
    redraw: boolean
}

class BlueprintMenuComponent implements ClassComponent<Attrs> {
    private filterExpr: string = "";

    // Note that class methods cannot infer parameter types
    oninit({attrs}: CVnode<Attrs>) {
    }

    onbeforeupdate(vnode: CVnode<Attrs>, old: CVnodeDOM<Attrs>): boolean | void {
        return true;
    }

    view({attrs}: CVnode<Attrs>) {
        const blueprints = attrs.onLoad();
        return m(".sl-blupr-menu", {
                onmouseleave: (e: MithrilMouseEvent) => {
                    e.redraw = false;
                    attrs.onHover(undefined);
                }
            },
            [
                m(".sl-blupr-fltr",
                    m("input.sl-blupr-input[type=text]", {
                        oncreate: (v: CVnodeDOM<any>) => {
                            if (v.attrs.autofocus) {
                                (v.dom as HTMLElement).focus();
                            }
                        },
                        oninput: m.withAttr("value", function (f: string) {
                            attrs.onFilter(f.trim());
                        }),
                        autofocus: true,
                    })),
                m(".sl-blupr-entries",
                    blueprints.length ? blueprints.map((blueprint: BlueprintModel) => {
                        return m(".sl-blupr-entry", {
                                onclick: (e: MithrilMouseEvent) => {
                                    e.redraw = false;
                                    attrs.onSelect(blueprint);
                                },
                                onmouseenter: (e: MithrilMouseEvent) => {
                                    e.redraw = false;
                                    attrs.onHover(blueprint);
                                },
                            },
                            m(".sl-blupr-title", blueprint.getFullName()))
                    }) : m(".sl-blupr-entry-none")
                )
            ]
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
    private filterExpr: string = "";

    constructor(private readonly blueprintView: BlueprintView, private relPos: [number, number], private readonly absPos: [number, number]) {
        this.graph = blueprintView.getGraph();
        this.blueprint = blueprintView.getBlueprint();
        this.landscape = this.blueprint.getAncestorNode(LandscapeModel)!;

        this.placeGhostRect([relPos[0] - 50, relPos[1] - 50]);

        this.el = document.createElement('div');
        this.el.style.position = 'absolute';
        this.el.style.left = `${absPos[0]}px`;
        this.el.style.top = `${absPos[1]}px`;
        this.blueprintView.getFrame().getHTMLElement().appendChild(this.el);

        this.blueprintMenu = new BlueprintMenuComponent();

        m.mount(this.el, {
            view: () => m(this.blueprintMenu, {
                onLoad: () => this.getBlueprints(),
                onFilter: (fltrExpr: string) => {
                    this.filterExpr = fltrExpr;
                },
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
        });
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

    private isFilterExprIncluded(blueprint: BlueprintModel): boolean {
        return this.filterExpr === "" || blueprint.getFullName().toLowerCase().includes(this.filterExpr.toLowerCase());
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
            .filter(([bp, _]: [BlueprintModel, number]) => this.isFilterExprIncluded(bp))
            .sort((a: [BlueprintModel, number], b: [BlueprintModel, number]) => a[1] - b[1])
            .map(([bp, _]: [BlueprintModel, number]) => bp);

        for (const bp of this.landscape.getChildNodes(BlueprintModel)) {
            if (blueprints.length < 10) {
                if (this.isFilterExprIncluded(bp)) {
                    if (blueprints.indexOf(bp) < 0) {
                        blueprints.push(bp);
                    }
                }
            } else {
                break;
            }
        }
        return blueprints;
    }

    private placeGhostRect([posX, posY]: [number, number], blueprint?: BlueprintModel) {
        if (this.ghostRect) {
            this.ghostRect.remove();
        }

        if (!blueprint) {
            this.ghostRect = new BlackBoxComponent.GhostRectangle();
            this.ghostRect.addTo(this.graph);
        } else {
            this.ghostRect = new BlueprintBoxComponent(this.graph, blueprint).getRectangle();
        }
        this.ghostRect.position(posX, posY);
    }
}
