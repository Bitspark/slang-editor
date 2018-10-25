import {dia, shapes} from 'jointjs';

import {LandscapeModel} from '../model/landscape';
import {BlueprintModel, BlueprintType} from '../model/blueprint';
import {Subject} from "rxjs";

export class LandscapeComponent {
    private graph: dia.Graph | null;
    private filter: (blueprint: BlueprintModel) => boolean | null;
    private blueprintRects = new Map<string, shapes.standard.Rectangle>();
    private addBlueprintButton: dia.Element;
    private slangLogo: dia.Element;
    private destroyed = new Subject<void>();

    constructor(graph: dia.Graph, private landscape: LandscapeModel, filter?: (blueprint: BlueprintModel) => boolean) {
        this.graph = graph;
        if (filter) {
            this.filter = filter;
        }

        this.redraw();
        this.subscribe(landscape);
    }

    public destroy() {
        this.graph = null;
        this.destroyed.next();
    }

    private subscribe(landscape: LandscapeModel) {
        const that = this;
        landscape.subscribeBlueprintAdded(function (bp: BlueprintModel) {
            if (!that.filter || that.filter(bp)) {
                that.addBlueprint(bp);
                that.reorder();
            }
        });
    }

    private addBlueprints(landscape: LandscapeModel) {
        let blueprints = Array.from(landscape.getBlueprints());
        if (this.filter) {
            blueprints = blueprints.filter(this.filter);
        }
        for (const bp of blueprints) {
            this.addBlueprint(bp);
        }
    }

    public reorder(width?: number, height?: number) {
        const blueprintFullnames = Array.from(this.blueprintRects.keys());
        blueprintFullnames.sort();

        if (width && height) {
            this.reorderEqually(blueprintFullnames, width, height);
        } else {
            this.reorderEqually(blueprintFullnames, 1000, 600);
        }
    }

    public redraw(width?: number, height?: number) {
        if (!this.graph) {
            return;
        }

        this.graph.clear();

        this.addCreateButton();
        this.addBlueprints(this.landscape);
        this.addSlangLogo();

        this.reorder(width, height);
    }

    private reorderCircle(blueprintFullnames: Array<string>) {
        const blueprintCount = blueprintFullnames.length + 1;
        const ankleStep = 2 * Math.PI / blueprintCount;
        const radius = 100 + blueprintCount * 150 / 2 / Math.PI;
        let ankle = -Math.PI / 2 + ankleStep;

        // Blueprints
        for (const fullname of blueprintFullnames) {
            const rect = this.blueprintRects.get(fullname)!;
            const posX = Math.cos(ankle) * radius;
            const posY = Math.sin(ankle) * radius;
            rect.position(posX - rect.getBBox().width / 2, posY - rect.getBBox().height / 2);
            ankle += ankleStep;
        }

        // Button
        const btn = this.addBlueprintButton;
        let posX = Math.cos(ankle) * radius;
        let posY = Math.sin(ankle) * radius;
        btn.position(posX - btn.getBBox().width / 2, posY - btn.getBBox().height / 2);

        // Slang logo
        const logo = this.slangLogo;
        posX = 0;
        posY = 0;
        logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
    }

    private reorderSpiral(blueprintFullnames: Array<string>) {
        const ankleStep = 200;
        const radiusStep = 8000;
        let radius = 200;
        let ankle = 0;

        // Blueprints
        for (const fullname of blueprintFullnames) {
            const rect = this.blueprintRects.get(fullname)!;
            const posX = Math.cos(ankle) * radius - rect.getBBox().width / 2;
            const posY = Math.sin(ankle) * radius - rect.getBBox().height / 2;
            rect.position(posX, posY);
            ankle += 1 / radius * ankleStep;
            radius += 1 / radius * radiusStep;
        }

        // Button
        const btn = this.addBlueprintButton;
        let posX = Math.cos(ankle) * radius;
        let posY = Math.sin(ankle) * radius;
        btn.position(posX - btn.getBBox().width / 2, posY - btn.getBBox().height / 2);

        // Slang logo
        const logo = this.slangLogo;
        posX = 0;
        posY = 0;
        logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
    }

    private reorderConcentric(blueprintFullnames: Array<string>) {
        const blueprintCount = blueprintFullnames.length + 1;

        const circleStep = 8;

        let circle = 1;
        let circleCapacity = 8;
        let elements = 0;

        // Blueprints
        for (const fullname of blueprintFullnames) {

            const ankle = (2 * Math.PI / circleCapacity) * elements;
            const radius = circleCapacity * 200 / 2 / Math.PI;

            const rect = this.blueprintRects.get(fullname)!;
            const posX = Math.cos(ankle) * radius;
            const posY = Math.sin(ankle) * radius;

            rect.position(posX - rect.getBBox().width / 2, posY - rect.getBBox().height / 2);

            elements++;

            if (elements % circleCapacity == 0) {
                circle++;
                circleCapacity += circleStep;
                elements = 0;
            }
        }

        // Button
        const btn = this.addBlueprintButton;
        let posX = 0;
        let posY = 0;
        btn.position(posX - btn.getBBox().width / 2, posY - btn.getBBox().height / 2);

        // Slang logo
        const logo = this.slangLogo;
        posX = 0;
        posY = 0;
        logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
    }

    private reorderEqually(blueprintFullnames: Array<string>, width: number, height: number) {
        const columns = Math.min(5, Math.floor((width - 400) / 200));
        const rows = Math.max((blueprintFullnames.length + 1) / columns);

        let i = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                let rect: dia.Element | null = null;

                if (i > 0) {
                    const fullname = blueprintFullnames[i - 1];
                    if (!fullname) {
                        break;
                    }
                    rect = this.blueprintRects.get(fullname)!;
                } else {
                    rect = this.addBlueprintButton;
                }

                const posX = (col - columns / 2 + 0.5) * 200;
                const posY = -height / 2 + 100 + (row + 1) * 200;

                rect.position(posX - rect.getBBox().width / 2, posY - rect.getBBox().height / 2);

                i++;
            }
        }

        // Slang logo
        const logo = this.slangLogo;
        let posX = 0;
        let posY = -height / 2 + 100;
        logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
    }

    private addCreateButton() {
        if (!this.graph) {
            return;
        }

        const rect = new shapes.standard.Rectangle();
        rect.resize(120, 120);
        rect.attr({
            body: {
                fill: "red",
                cursor: "pointer"
            },
            label: {
                text: "+",
                fill: 'white',
                cursor: "pointer"
            }
        });
        rect.attr("draggable", false);
        rect.addTo(this.graph);

        const that = this;
        rect.on('pointerclick', function (evt: Event, x: number, y: number) {
            that.landscape.createBlueprint(`Unnamed${new Date().getTime()}`, BlueprintType.Local).open();
        });

        this.addBlueprintButton = rect;
    }

    private addSlangLogo() {
        if (!this.graph) {
            return;
        }

        var image = new shapes.basic.Image({
            size: {
                width: 177,
                height: 203
            },
            attrs: {
                image: {
                    "xlink:href": "https://files.bitspark.de/slang2.png",
                    width: 177,
                    height: 203,
                    cursor: "default"
                }
            }
        });
        image.attr('draggable', false);
        image.attr('clickthrough', true);
        this.graph.addCell(image);

        this.slangLogo = image;
    }

    private addBlueprint(blueprint: BlueprintModel) {
        if (!this.graph) {
            return;
        }

        const rect = new shapes.standard.Rectangle();
        rect.resize(120, 120);
        rect.attr({
            body: {
                fill: 'blue',
                cursor: 'default'
            },
            label: {
                text: blueprint.getShortName(),
                fill: 'white',
                cursor: 'default'
            }
        });
        rect.attr('draggable', false);
        rect.addTo(this.graph);

        this.blueprintRects.set(blueprint.getFullName(), rect);

        // JointJS -> Model
        rect.on('pointerclick', function (evt: Event, x: number, y: number) {
            blueprint.select();
        });
        rect.on('pointerdblclick', function (evt: Event, x: number, y: number) {
            blueprint.open();
        });

        // Model -> JointJS
        blueprint.subscribeDeleted(function () {
            rect.remove();
        });
        blueprint.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                rect.attr('body/fill', 'orange');
            } else {
                rect.attr('body/fill', 'blue');
            }
        });
    }
}
