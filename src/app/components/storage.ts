import {ApiService, BlueprintApiResponse} from '../services/api';
import {AppModel} from '../model/app';
import {fillLandscape} from '../services/mapper';

export class APIStorageComponent {

    private api: ApiService;

    constructor(private app: AppModel, host: string) {
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

export class StaticStorageComponent {

    constructor(private app: AppModel, private url: string) {
        this.subscribe();
    }

    private subscribe() {
        this.app.subscribeLoadRequested(() => {
            return this.load();
        });
    }

    private async load(): Promise<void> {
        return new Promise<void>(async resolve => {
            fetch(this.url)
                .then((response: Response) => response.json())
                .then(async (data: any) => {
                    const objects = data.objects as Array<BlueprintApiResponse>;
                    fillLandscape(this.app.getLandscape(), objects);
                    resolve();
                });
        });
    }

}
