import {BehaviorSubject} from 'rxjs';
import {BlueprintModel} from './blueprint';
import {LandscapeModel} from './landscape';

export class AppModel {
    
    private openedBlueprint = new BehaviorSubject<BlueprintModel | null>(null);
    private openedLandscape = new BehaviorSubject<LandscapeModel | null>(null);
    
    private landscape: LandscapeModel = new LandscapeModel();
    
    constructor() {
        this.subscribeLandscape(this.landscape);
    }
    
    public getLandscape(): LandscapeModel {
        return this.landscape;
    }
    
    private subscribeLandscape(landscape: LandscapeModel) {
        for (const blueprint of landscape.getBlueprints()) {
            this.subscribeBlueprint(blueprint);
        }
        landscape.subscribeBlueprintAdded(blueprint => {
            this.subscribeBlueprint(blueprint);
        });
    }
    
    private subscribeBlueprint(blueprint: BlueprintModel) {
        blueprint.subscribeOpenedChanged(opened => {
            if (opened) {
                this.openedBlueprint.next(blueprint);
            } else {
                if (blueprint === this.openedBlueprint.getValue()) {
                    this.openedBlueprint.next(null);
                    this.openedLandscape.next(this.landscape);
                }
            }
        });
    }
    
    // Actions
    
    // Subscriptions

    public subscribeOpenedBlueprintChanged(cb: (bp: BlueprintModel) => void) {
        this.openedBlueprint.subscribe(cb);
    }

    public subscribeOpenedLandscapeChanged(cb: (ls: LandscapeModel) => void) {
        this.openedLandscape.subscribe(cb);
    }
    
}