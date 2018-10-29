import {StorageComponent} from './storage';
import {ApiService} from '../services/api';
import {LandscapeComponent} from './landscape';
import {BlueprintComponent} from './blueprint';
import {BlueprintType} from '../model/blueprint';
import {Canvas} from '../joint/cavas';
import {RouterComponent} from './router';
import {AppModel} from '../model/app';

export class AppComponent {
    private landscapeComponent: LandscapeComponent | null = null;
    private storageComponent: StorageComponent;
    private routerComponent: RouterComponent;
    private canvas: Canvas;

    constructor(private appModel: AppModel, private el: HTMLElement, host: string) {
        this.canvas = new Canvas(el);

        const landscapeModel = appModel.getLandscape();

        this.routerComponent = new RouterComponent(appModel);
        this.storageComponent = new StorageComponent(landscapeModel, new ApiService(host));

        this.subscribe();
    }

    private subscribe(): void {
        this.appModel.subscribeOpenedBlueprintChanged(blueprint => {
            if (blueprint !== null) {
                this.canvas.reset();
                new BlueprintComponent(this.canvas.getGraph(), blueprint);
            }
        });

        this.appModel.subscribeOpenedLandscapeChanged(landscape => {
            if (landscape !== null) {
                this.canvas.reset();
                // TODO: Destroy
                this.landscapeComponent = new LandscapeComponent(this.canvas.getGraph(), landscape, bp => bp.getType() === BlueprintType.Local);
                this.landscapeComponent.reorder(this.canvas.getWidth(), this.canvas.getHeight());
            }
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
        if (this.landscapeComponent) {
            this.landscapeComponent.reorder(this.canvas.getWidth(), this.canvas.getHeight());
        }
    }
}