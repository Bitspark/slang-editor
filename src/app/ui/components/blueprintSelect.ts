/// <amd-dependency path="rivets" />

import {dia, shapes, util} from 'jointjs';
import m from 'mithril';


import {LandscapeModel} from '../../model/landscape';
import {BlueprintModel} from '../../model/blueprint';
import {BlackBoxComponent} from "./blackbox";
import {BlueprintComponent} from "./blueprint";
import {ClassComponent, CVnode} from "mithril";
import {BlueprintPortModel} from "../../model/port";

export interface Attrs {
    blueprints: IterableIterator<BlueprintModel>
}

class BlueprintMenuComponent implements ClassComponent<Attrs> {
    private blueprints: IterableIterator<BlueprintModel>;

    // Note that class methods cannot infer parameter types
    oninit({attrs}: CVnode<Attrs>) {
        this.blueprints = attrs.blueprints;
    }

    view({attrs}: CVnode<Attrs>) {
        return m('.sl-blupr-menu', [
            m('.sl-blupr-entry', Array.from(this.blueprints).map((blueprint: BlueprintModel) => {
                return m('h1.sl-bluepr-title', blueprint.getFullName())
            }))
        ])
    }
}


export class BlueprintSelectComponent {
    private filter: ((_: any) => boolean) | null = null;
    private filteredBlueprints: Array<BlueprintModel> = [];
    private readonly graph: dia.Graph;
    private readonly landscape: LandscapeModel;
    private readonly placeholderRect: shapes.standard.Rectangle;
    private readonly blueprintMenuContainer: HTMLElement;
    private x: number;
    private y: number;

    constructor(private containingBlueprint: BlueprintComponent, [relX, relY]: [number, number], [absX, absY]: [number, number]) {
        this.landscape = containingBlueprint.getLandscape();
        this.graph = containingBlueprint.getGraph();

        this.placeholderRect = BlueprintSelectComponent.createPlaceholder(relX, relY);
        this.placeholderRect.addTo(this.graph);

        this.blueprintMenuContainer = BlueprintSelectComponent.createBlueprintMenu(absX, absY);
        document.body.appendChild(this.blueprintMenuContainer);

        m.render(this.blueprintMenuContainer, m(new BlueprintMenuComponent(), {blueprints: this.filteredBlueprints}));

        this.subscribe();
    }

    public destroy() {
    }

    private subscribe() {
        const that = this;
        this.landscape.subscribeBlueprintAdded(function (bp: BlueprintModel) {
            if (!that.filter || that.filter(bp)) {
                that.appendBlueprintMenuEntry(bp);
            }
        });
    }

    private static createPlaceholder(posX: number, posY: number): shapes.standard.Rectangle {
        const phRect = new shapes.standard.Rectangle({
            size: {width: 100, height: 100},
            position: {x: posX - 50, y: posY - 50},
            attrs: {
                root: {},
                body: {
                    fill: "gray",
                    fillOpacity: ".15",
                    stroke: "black",
                    strokeWidth: "1",
                    strokeOpacity: ".35",
                    rx: 8,
                    ry: 8,
                },
                label: {
                    text: "placeholder",
                    fill: "black",
                    fillOpacity: ".35",
                },
            },
        });
        phRect.attr("draggable", false);
        return phRect;
    }

    private static createBlueprintMenu(absX: number, absY: number): HTMLElement {
        const el = document.createElement("div");
        el.innerHTML = "" +
            "<div style='position: absolute, width: 256px; max-height: 384px; left: {{x}}px; top: {{y}}px' class='sl-blupr-menu'>" +
            "<h1>{{t}}</h1>" +
            //"<div rv-each-blueprint='blueprints' class='sl-blupr-entry'>" +
            //"<span id='' class='sl-blupr-preview'></span><span class='sl-blupr-text'><h1>{{blueprint.getFullName}}</h1></span>" +
            //"</div>" +
            "</div>";
        return el;


        /*
        const el: HTMLElement = document.createElement('div');
        el.style.position = "absolute";
        el.style.width = "256px";
        el.style.maxHeight = "384";
        el.style.left = `${absX}px`;
        el.style.top = `${absY}px`;
        el.style.overflow = "hidden";
        */
    }

    /*
    private buildBuleprintMenu() {
        let blueprints = Array.from(this.landscape.getBlueprints());
        if (this.filter) {
            blueprints = blueprints.filter(this.filter);
        }
        for (const bp of blueprints) {
            this.appendBlueprintMenuEntry(bp);
        }
    }
    */

    private createBlueprintBlackBox(el: ChildNode, blueprint: BlueprintModel): BlackBoxComponent {
        const graph = new dia.Graph();

        new dia.Paper({
            el: el,
            model: graph,
            width: 100,
            height: 100,
            gridSize: 10,
            drawGrid: true,
            interactive: false,
        });

        const blueprintBB = new BlackBoxComponent(blueprint);
        blueprintBB.attr({
            body: {
                cursor: "pointer",
            },
            label: {
                cursor: "pointer"
            }
        });
        blueprintBB.position(this.x, this.y);
        blueprintBB.attr("draggable", false);
        blueprintBB.addTo(graph);

        return blueprintBB;
    }

    /*
    private appendBlueprintMenuEntry(blueprint: BlueprintModel) {
        const entryEl: HTMLElement = document.createElement("div");
        entryEl.innerHTML = `<div class='sl-blupr-preview'></div><div class='sl-blupr-descrp'>${blueprint.getFullName()}</div>`;
        entryEl.style.background = "#efefef";
        entryEl.style.borderBottom = "1px solid #999";
        const blueprintBB = this.createBlueprintBlackBox(entryEl.firstChild!, blueprint);

        this.blueprintMenuContainer.appendChild(entryEl);
        this.rectBlueprints.set(blueprint.getFullName(), blueprintBB);

        // JointJS -> Model
        blueprintBB.on("pointerclick", function () {
            console.log(">>> SELECTED", blueprint)
        });
        blueprintBB.on("pointerdblclick", function () {
        });

        // Model -> JointJS
        blueprint.subscribeDeleted(function () {
            blueprintBB.remove();
        });


        const rectBlueprint = new BlackBoxComponent(blueprint);
        rectBlueprint.attr({
            body: {
                cursor: "pointer",
            },
            label: {
                cursor: "pointer"
            }
        });
        rectBlueprint.position(this.x, this.y);
        rectBlueprint.attr("draggable", false);
        rectBlueprint.addTo(this.graph);

        this.rectBlueprints.set(blueprint.getFullName(), rectBlueprint);

        // JointJS -> Model
        rectBlueprint.on("pointerclick", function () {
            console.log(">>> SELECTED", blueprint)
        });
        rectBlueprint.on("pointerdblclick", function () {
        });

        // Model -> JointJS
        blueprint.subscribeDeleted(function () {
            rectBlueprint.remove();
        });
    }
    */
}
