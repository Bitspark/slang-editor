import {LandscapeModel} from "../model/landscape";
import {BlueprintModel} from "../model/blueprint";

export class StorageComponent {

    constructor(private landscape: LandscapeModel, private host: string) {
    }

    public load(): void {
        this.landscape.addBlueprint(new BlueprintModel('bp1'));
        this.landscape.addBlueprint(new BlueprintModel('bp2'));
        // ...
    }

}