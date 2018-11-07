import {ApiService, BlueprintApiResponse} from "../custom/api";
import {AppModel} from "../model/app";
import {fillLandscape} from "../custom/mapper";
import {SlangPlugin} from "./plugin";

export class APIStoragePlugin extends SlangPlugin {
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

export class StaticStoragePlugin extends SlangPlugin {

    constructor(app: AppModel, private url: string) {
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
