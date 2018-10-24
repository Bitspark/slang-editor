import {LandscapeModel} from "../model/landscape";
import {StorageComponent} from "./storage";
import {ApiService} from "../services/api";
import {LandscapeComponent} from "./landscape";
import {BlueprintComponent} from "./blueprint";
import {BlueprintType} from "../model/blueprint";
import {Canvas} from "../ui/cavas";

export class AppComponent {
    private readonly landscapeModel: LandscapeModel;
    private landscapeComponent: LandscapeComponent;
    private storageComponent: StorageComponent;
    private canvas: Canvas;

    constructor(private el: HTMLElement, host: string) {
        this.canvas = new Canvas(el);
        this.landscapeModel = new LandscapeModel();
        this.landscapeComponent = new LandscapeComponent(this.canvas.getGraph(), this.landscapeModel, (bp) => bp.getType() === BlueprintType.Local);
        this.storageComponent = new StorageComponent(this.landscapeModel, new ApiService(host));
        this.subscribe();
    }

    private subscribe(): void {
        const that = this;
        this.landscapeModel.subscribeBlueprintAdded(blueprint => {
            blueprint.subscribeOpenedChanged(opened => {
                if (opened) {
                    new BlueprintComponent(this.canvas.getGraph(), blueprint);
                }
            });
        });
    }

    public async start(): Promise<void> {
        return new Promise<void>(async resolve => {
            await this.storageComponent.load();
            resolve();
        });
    }

    public resize() {
        this.canvas.resize(this.el.clientWidth, this.el.clientHeight);
    }
}