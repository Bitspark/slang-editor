import {BlueprintModel} from './blueprint';
import {LandscapeModel, LandscapeModelArgs} from './landscape';
import {SlangNode} from '../custom/nodes';
import {SlangBehaviorSubject, SlangSubject} from '../custom/events';

export class AppModel extends SlangNode {

    private openedBlueprint = new SlangBehaviorSubject<BlueprintModel | null>('opened-blueprint', null);
    private openedLandscape = new SlangBehaviorSubject<LandscapeModel | null>('opened-landscape', null);
    private loadRequested = new SlangSubject<void>('load-requested');

    private loading: Array<Promise<void>> = [];

    constructor(private name: string) {
        super(null);
        const landscape = this.createChildNode<LandscapeModel, LandscapeModelArgs>(LandscapeModel, {});
        this.subscribeLandscape(landscape);
    }
    
    public getLandscape(): LandscapeModel {
        return this.getChildNode<LandscapeModel>(LandscapeModel)!;
    }
    
    private subscribeLandscape(landscape: LandscapeModel) {
        for (const blueprint of landscape.getChildNodes<BlueprintModel>(BlueprintModel)) {
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