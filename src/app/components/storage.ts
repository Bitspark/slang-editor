import {LandscapeModel} from "../model/landscape";
import {BlueprintModel} from "../model/blueprint";
import {ApiService} from "../services/api";
import {Subject} from "rxjs";

export class StorageComponent {
    private blueprintsLoaded = new Subject<Array<BlueprintModel>>();

    constructor(private landscape: LandscapeModel, private api: ApiService) {

    }

    public async load(): Promise<void> {
        const bpList: Array<BlueprintModel> = await this.api.getBlueprints();
        return new Promise<void>(resolve => {
            bpList.forEach(bp => this.landscape.addBlueprint(bp));
            resolve();
        });
    }

    public subscribeBlueprintsLoaded(cb: (_: Array<BlueprintModel>) => void): void {
        this.blueprintsLoaded.subscribe(cb);
    }
}