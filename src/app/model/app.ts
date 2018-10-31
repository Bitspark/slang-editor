import {BehaviorSubject, Subject} from 'rxjs';
import {BlueprintModel} from './blueprint';
import {LandscapeModel} from './landscape';

export class AppModel {
    
    private openedBlueprint = new BehaviorSubject<BlueprintModel | null>(null);
    private openedLandscape = new BehaviorSubject<LandscapeModel | null>(null);
    private loadRequested = new Subject<void>();
    
    private landscape: LandscapeModel = new LandscapeModel();
    
    private loading: Array<Promise<void>> = [];
    
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
        landscape.subscribeOpenedChanged(opened => {
            if (opened) {
                const openedBlueprint = this.openedBlueprint.getValue();
                if (openedBlueprint !== null) {
                    openedBlueprint.close();
                }
                this.openedLandscape.next(landscape);
            } else {
                if (landscape === this.openedLandscape.getValue()) {
                    this.openedLandscape.next(null);
                }
            }
        })
    }
    
    private subscribeBlueprint(blueprint: BlueprintModel) {
        blueprint.subscribeOpenedChanged(opened => {
            if (opened) {
                const openedLandscape = this.openedLandscape.getValue();
                if (openedLandscape !== null) {
                    openedLandscape.close();
                }
                this.openedBlueprint.next(blueprint);
            } else {
                if (blueprint === this.openedBlueprint.getValue()) {
                    this.openedBlueprint.next(null);
                }
            }
        });
    }
    
    // Actions
    
    public load(): Promise<void> {
        return new Promise<void>(async resolve => {
            this.loadRequested.next();
            const loading = this.loading;
            this.loading = [];
            await Promise.all(loading);
            resolve();
        });
    }
    
    // Subscriptions

    public subscribeOpenedBlueprintChanged(cb: (bp: BlueprintModel | null) => void) {
        this.openedBlueprint.subscribe(cb);
    }

    public subscribeOpenedLandscapeChanged(cb: (ls: LandscapeModel | null) => void) {
        this.openedLandscape.subscribe(cb);
    }
    
    public subscribeLoadRequested(cb: () => Promise<void>) {
        this.loadRequested.subscribe(() => {
            this.loading.push(cb());
        });
    }
    
}