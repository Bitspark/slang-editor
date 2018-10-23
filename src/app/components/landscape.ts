import {dia, shapes} from 'jointjs';

import {LandscapeModel} from '../model/landscape';
import {BlueprintModel} from "../model/blueprint";

export class LandscapeComponent {
    private graph = new dia.Graph();
    private paper: dia.Paper;

    constructor(private landscape: LandscapeModel, private id: string) {
        this.bindToDOM(id);
        this.subscribe(landscape);
    }
    
    private bindToDOM(id: string) {
        this.paper = new dia.Paper({
            el: document.getElementById(id),
            model: this.graph,
            width: 800,
            height: 600,
            gridSize: 1
        });
    }

    private subscribe(ls: LandscapeModel) {
        const that = this;
        ls.subscribeBlueprintAdded(function (bp: BlueprintModel)  {
            that.addBlueprint(bp);
        });
    }

    public addBlueprint(bp: BlueprintModel) {
        const rect = new shapes.standard.Rectangle();
        rect.position(100, 30);
        rect.resize(100, 40);
        rect.attr({
            body: {
                fill: 'blue'
            },
            label: {
                text: bp.getName(),
                fill: 'white'
            }
        });
        rect.addTo(this.graph);
    }

}
