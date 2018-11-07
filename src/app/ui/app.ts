import {HTMLCanvas} from "./cavas";
import {AppModel} from "../model/app";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {BlueprintView} from "./views/blueprint";
import {LandscapeView} from "./views/landscape";
import {SlangPlugin} from "../plugins/plugin";
import {View} from "./views/view";

class AppHTMLCanvas extends HTMLCanvas {

    constructor(el: HTMLElement) {
        super(el);
    }

}

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

    public createPlugin(ctor: new(appModel: AppModel, ...args: any) => SlangPlugin, ...args: any): SlangPlugin {
        const plugin = new ctor(this.app, ...args);
        this.plugins.push(plugin);
        return plugin;
    }
    
    public createCanvas(el: HTMLElement, outlet: boolean = false): HTMLCanvas {
        const canvas = new AppHTMLCanvas(el);
        this.canvases.push(canvas);
        if (outlet) {
            this.outlet = canvas;
        }
        return canvas;
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