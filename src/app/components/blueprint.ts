import {BlueprintModel} from '../model/blueprint';
import {dia, shapes} from "jointjs";
import {redirectPaperEvents} from "./utils";

export class BlueprintComponent {
    private graph = new dia.Graph();
    private paper: dia.Paper;

    constructor(private blueprint: BlueprintModel, private id: string) {
        const elem = document.getElementById(id);
        const newElem = document.createElement('div');
        const p = elem!.parentElement;
        newElem.id = id;
        elem!.remove();
        p!.appendChild(newElem);


        this.paper = new dia.Paper({
            el: document.getElementById(id),
            model: this.graph,
            width: 600,
            height: 600,
            gridSize: 10,
            drawGrid: {
                name: "fixedDot",
                color: "#000000",
            },
            background: {
                color: '#d7dcf2',
            }
        });

        redirectPaperEvents(this.paper);
    }

}