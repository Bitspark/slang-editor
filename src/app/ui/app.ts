import {HTMLCanvas} from "./cavas";
import {AppModel} from "../model/app";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {BlueprintView} from "./views/blueprint";
import {LandscapeView} from "./views/landscape";
import {SlangPlugin} from "../plugins/plugin";

export class SlangApp {

    private plugins: Array<SlangPlugin> = [];
    private canvases: Array<HTMLCanvas> = [];
    private outlet: HTMLCanvas | null;

    constructor(private app: AppModel) {
    }

    private subscribe(): void {
        this.app.subscribeOpenedBlueprintChanged(blueprint => {
            if (blueprint !== null && this.outlet) {
                this.outlet.setView(
                    BlueprintView,
                    blueprint);
            }
        });

        this.app.subscribeOpenedLandscapeChanged(landscape => {
            if (landscape !== null && this.outlet) {
                this.outlet.setView(
                    LandscapeView,
                    landscape,
                    (bp => bp.getType() === BlueprintType.Local) as (bp: BlueprintModel) => boolean);
            }
        });
    }

    public addPlugin(plugin: SlangPlugin): void {
        this.plugins.push(plugin);
    }
    
    public addCanvas(canvas: HTMLCanvas, outlet: boolean = false): void {
        this.canvases.push(canvas);
        if (outlet) {
            this.outlet = canvas;
        }
    }

    public setOutlet(canvas: HTMLCanvas): void {
        if (this.canvases.indexOf(canvas) === -1) {
            throw new Error(`outlet has to be owned by the app`);
        }
        this.outlet = canvas;
    }

    public async load(): Promise<void> {
        this.subscribe();
        return this.app.load();
    }

}