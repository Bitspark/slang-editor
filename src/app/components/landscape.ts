import {dia, shapes} from 'jointjs';

import {LandscapeModel} from '../model/landscape';
import {BlueprintModel} from '../model/blueprint';

export class LandscapeComponent {
    constructor(private graph: dia.Graph, private landscape: LandscapeModel, private filter?: (blueprint: BlueprintModel) => boolean) {
        this.graph.clear();
        this.subscribe(landscape);
        this.drawBlueprints();
        if (filter !== undefined) {
            this.filter = filter;
        }
    }

    private subscribe(landscape: LandscapeModel) {
        const that = this;
        landscape.subscribeBlueprintAdded(function (bp: BlueprintModel) {
            if (!that.filter || that.filter(bp)) {
                that.addBlueprint(bp);
            }
        });
    }

    private drawBlueprints() {
        let blueprints = Array.from(this.landscape.getBlueprints());
        if (this.filter) {
            blueprints = blueprints.filter(this.filter);
        }
        for (const bp of blueprints) {
            this.addBlueprint(bp);
        }
    }

    private addBlueprint(blueprint: BlueprintModel) {
        const rect = new shapes.standard.Rectangle();

        rect.position(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000);
        rect.resize(120, 120);
        rect.attr({
            body: {
                fill: 'blue'
            },
            label: {
                text: blueprint.getShortName(),
                fill: 'white',
                cursor: 'default'
            }
        });
        rect.addTo(this.graph);

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
