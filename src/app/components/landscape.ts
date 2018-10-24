import {dia, shapes} from 'jointjs';

import {LandscapeModel} from '../model/landscape';
import {BlueprintModel} from '../model/blueprint';
import {addPanning, addZooming, fillParent, redirectPaperEvents} from "./utils";

export class LandscapeComponent {
    private graph = new dia.Graph();
    private paper: dia.Paper;
    private container: HTMLElement | null;
    private canvas: HTMLElement | null;

    constructor(landscape: LandscapeModel, id: string) {
        this.createPaper(id);
        this.subscribe(landscape);
    }

    private subscribe(landscape: LandscapeModel) {
        const that = this;
        landscape.subscribeBlueprintAdded(function (bp: BlueprintModel) {
            that.addBlueprint(bp);
        });
    }

    private createPaper(id: string) {
        this.container = document.getElementById(id)!;
        this.container.innerHTML = '';
        this.canvas = document.createElement('div');
        this.container.appendChild(this.canvas);

        this.paper = new dia.Paper({
            el: this.canvas,
            model: this.graph,
            width: this.container.clientWidth,
            height: this.container.clientHeight,
            gridSize: 10,
            drawGrid: true
        });
        redirectPaperEvents(this.paper);
        addZooming(this.paper);
        addPanning(this.paper);
    }

    private addBlueprint(blueprint: BlueprintModel) {
        const rect = new shapes.standard.Rectangle();

        rect.position(
            Math.random() * 2000 - 500,
            Math.random() * 2000 - 500);
        rect.resize(100, 40);
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

    public resize() {
        fillParent(this.paper, this.container!);
    }

}
