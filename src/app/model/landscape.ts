import {BlueprintModel} from "./blueprint";
import {Subject} from "rxjs";

export class LandscapeModel {
    
    private blueprintAdded = new Subject<BlueprintModel>();
    private blueprints: Array<BlueprintModel> = [];
    
    public addBlueprint(bp: BlueprintModel) {
        this.blueprints.push(bp);
        this.blueprintAdded.next(bp);
    }
    
    public subscribeBlueprintAdded(cb: (bp: BlueprintModel) => void): void {
        this.blueprintAdded.subscribe(cb);
    }
    
}