import {StoragePlugin} from '../plugins/storage';
import {ApiService} from '../custom/api';
import {LandscapeComponent} from './components/landscape';
import {BlueprintComponent} from './components/blueprint';
import {BlueprintType} from '../model/blueprint';
import {CanvasComponent} from './components/cavas';
import {RouterPlugin} from '../plugins/router';
import {AppModel} from '../model/app';

export class SlangStudio {
    private landscapeComponent: LandscapeComponent | null = null;
    private storagePlugin: StoragePlugin;
    private routerPlugin: RouterPlugin;
    private canvas: CanvasComponent;

    constructor(private appModel: AppModel, private el: HTMLElement, host: string) {
        this.canvas = new CanvasComponent(el);

        const landscapeModel = appModel.getLandscape();

        this.routerPlugin = new RouterPlugin(appModel);
        this.storagePlugin = new StoragePlugin(landscapeModel, new ApiService(host));

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
            await this.storagePlugin.load();
            this.routerPlugin.checkRoute();
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