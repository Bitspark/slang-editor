import {ApiService, BlueprintApiResponse} from '../services/api';
import {AppModel} from '../model/app';
import {PluginComponent} from './app';
import {fillLandscape} from '../definition/slang';

export class HTTPStorageComponent extends PluginComponent {

    private api: ApiService;

    constructor(app: AppModel, host: string) {
        super(app);
        this.api = new ApiService(host);
        this.subscribe();
    }

    private subscribe() {
        this.app.subscribeLoadRequested(() => {
            return this.load();
        });
    }

    private async load(): Promise<void> {
        return new Promise<void>(async resolve => {
            fillLandscape(this.app.getLandscape(), await this.api.getBlueprints());
            resolve();
        });
    }
}

export class StaticStorageComponent extends PluginComponent {

    constructor(app: AppModel, private definitions: Array<BlueprintApiResponse>) {
        super(app);
        this.subscribe();
    }

    private subscribe() {
        this.app.subscribeLoadRequested(() => {
            return this.load();
        });
    }

    private async load(): Promise<void> {
        return new Promise<void>(async resolve => {
            fillLandscape(this.app.getLandscape(), this.definitions);
            resolve();
        });
    }

}