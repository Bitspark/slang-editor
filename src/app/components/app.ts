import {LandscapeModel} from "../model/landscape";
import {StorageComponent} from "./storage";
import {ApiService} from "../services/api";
import {LandscapeComponent} from "./landscape";
import {BlueprintComponent} from "./blueprint";
import {BlueprintType} from "../model/blueprint";

export class AppComponent {
    private readonly landscapeModel: LandscapeModel;
    private landscapeComponent: LandscapeComponent;
    private storageComponent: StorageComponent;

    constructor(private id: string, host: string) {
        this.landscapeModel = new LandscapeModel();
        this.landscapeComponent = new LandscapeComponent(this.landscapeModel, id, (bp) => bp.getType() === BlueprintType.Local);
        this.storageComponent = new StorageComponent(this.landscapeModel, new ApiService(host));
        this.subscribe();
    }
    
    private subscribe(): void {
        const that = this;
        this.landscapeModel.subscribeBlueprintAdded(blueprint => {
            blueprint.subscribeOpenedChanged(opened => {
                if (opened) {
                    new BlueprintComponent(blueprint, that.id);
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
        this.landscapeComponent.resize();
    }
}