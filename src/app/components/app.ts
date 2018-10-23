import {LandscapeModel} from "../model/landscape";
import {StorageComponent} from "./storage";
import {ApiService} from "../services/api";
import {LandscapeComponent} from "./landscape";

export class AppComponent {
    private readonly landscapeModel: LandscapeModel;
    private landscapeComponent: LandscapeComponent;
    private storageComponent: StorageComponent;

    constructor(id: string, host: string) {
        this.landscapeModel = new LandscapeModel();
        this.landscapeComponent = new LandscapeComponent(this.landscapeModel, id);
        this.storageComponent = new StorageComponent(this.landscapeModel, new ApiService(host));
        this.subscribe();
    }
    
    private subscribe(): void {
        this.landscapeModel.subscribeBlueprintAdded(blueprint => {
            blueprint.subscribeOpenedChanged(opened => {
                if (opened) {
                    alert(`Open blueprint ${blueprint.getFullName()}`);
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
}