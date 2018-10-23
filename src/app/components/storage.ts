import {LandscapeModel} from "../model/landscape";
import {BlueprintModel} from "../model/blueprint";
import {ApiService} from "../services/api";

export class StorageComponent {
    constructor(private landscape: LandscapeModel, private api: ApiService) {

    }

    public async load(): Promise<void> {
        const bpList: Array<BlueprintModel> = await this.api.getBlueprints();
        return new Promise<void>(resolve => {
            bpList.forEach(bp => this.landscape.addBlueprint(bp));
            resolve();
        });
    }
}