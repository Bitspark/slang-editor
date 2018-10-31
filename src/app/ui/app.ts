import {CanvasComponent} from "./components/cavas";
import {LandscapeComponent} from "./components/landscape";
import {AppModel} from "../model/app";
import {BlueprintComponent} from "./components/blueprint";
import {BlueprintType} from "../model/blueprint";

export class MainComponent {
    private landscapeComponent: LandscapeComponent | null = null;
    private canvas: CanvasComponent;

    constructor(private app: AppModel, private el: HTMLElement) {
        const that = this;
        window.addEventListener('resize', function () {
            that.resize();
        });
        window.addEventListener('load', function () {
            that.resize();
        });
        
        this.subscribe();
    }

    private subscribe(): void {
        this.app.subscribeOpenedBlueprintChanged(blueprint => {
            if (blueprint !== null) {
                new BlueprintComponent(this.canvas.getGraph(), blueprint);
                
                this.canvas.getPaper().scaleContentToFit({preserveAspectRatio: true});
                const scale = Math.min(1.0, this.canvas.getPaper().scale().sx * 0.8);
                this.canvas.getPaper().scale(scale);
                this.canvas.center();
            }
        });

        this.app.subscribeOpenedLandscapeChanged(landscape => {
            if (landscape !== null) {
                this.canvas.reset();
                // TODO: Destroy
                this.landscapeComponent = new LandscapeComponent(this.canvas.getGraph(), landscape, bp => bp.getType() === BlueprintType.Local);
                this.landscapeComponent.resize(this.canvas.getWidth(), this.canvas.getHeight());
            }
        });
    }

    public async start(): Promise<void> {
        return new Promise<void>(async resolve => {
            resolve();
        });
    }
    
    public async load(): Promise<void> {
        this.canvas = new CanvasComponent(this.el);
        return this.app.load();
    }

    public resize() {
        this.canvas.resize(this.el.clientWidth, this.el.clientHeight);
        if (this.landscapeComponent) {
            this.landscapeComponent.resize(this.canvas.getWidth(), this.canvas.getHeight());
        }
    }
}