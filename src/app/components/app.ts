import {LandscapeModel} from "../model/landscape";
import {StorageComponent} from "./storage";
import {ApiService} from "../services/api";
import {LandscapeComponent} from "./landscape";
import {BlueprintComponent} from "./blueprint";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {Canvas} from "../ui/cavas";
import {RouterComponent} from "./router";

export class AppComponent {
    private readonly landscapeModel: LandscapeModel;
    private landscapeComponent: LandscapeComponent;
    private storageComponent: StorageComponent;
    private routerComponent: RouterComponent;
    private openendBlueprint: BlueprintModel | null = null;
    private canvas: Canvas;

    constructor(private el: HTMLElement, host: string) {
        this.landscapeModel = new LandscapeModel();
        
        this.canvas = new Canvas(el);
        
        this.routerComponent = new RouterComponent(this.landscapeModel);
        this.landscapeComponent = new LandscapeComponent(this.canvas.getGraph(), this.landscapeModel, (bp) => bp.getType() === BlueprintType.Local);
        this.storageComponent = new StorageComponent(this.landscapeModel, new ApiService(host));
        
        this.subscribe();
    }

    private subscribe(): void {
        const that = this;
        this.landscapeModel.subscribeBlueprintAdded(blueprint => {
            blueprint.subscribeOpenedChanged(opened => {
                if (opened) {
                    // TODO: Kill LandscapeComponent
                    new BlueprintComponent(this.canvas.getGraph(), blueprint);
                    that.openendBlueprint = blueprint;
                } else {
                    if (blueprint === that.openendBlueprint) {
                        this.landscapeComponent = 
                            new LandscapeComponent(
                                this.canvas.getGraph(), 
                                this.landscapeModel, 
                                (bp) => bp.getType() === BlueprintType.Local);
                        // TODO: Kill BlueprintComponent
                    }
                }
            });
        });
    }

    public async start(): Promise<void> {
        return new Promise<void>(async resolve => {
            await this.storageComponent.load();
            this.routerComponent.checkRoute();
            resolve();
        });
    }

    public resize() {
        this.canvas.resize(this.el.clientWidth, this.el.clientHeight);
    }
}