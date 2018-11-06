import {HTMLCanvas} from "./cavas";
import {AppModel} from "../model/app";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {BlueprintView} from "./views/blueprint";
import {LandscapeView} from "./views/landscape";

export class MainComponent {
    
    private canvas: HTMLCanvas;

    constructor(private app: AppModel, private el: HTMLElement) {}

    private subscribe(): void {
        this.app.subscribeOpenedBlueprintChanged(blueprint => {
            if (blueprint !== null) {
                this.canvas.setView(
                    BlueprintView, 
                    blueprint);
            }
        });

        this.app.subscribeOpenedLandscapeChanged(landscape => {
            if (landscape !== null) {
                this.canvas.setView(
                    LandscapeView, 
                    landscape, 
                    (bp => bp.getType() === BlueprintType.Local) as (bp: BlueprintModel) => boolean);
            }
        });
    }

    public async load(): Promise<void> {
        this.canvas = new HTMLCanvas(this.el);
        this.subscribe();
        return this.app.load();
    }

}