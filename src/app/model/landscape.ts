import {BlueprintModel, BlueprintModelArgs} from './blueprint';
import {SlangNode} from '../custom/nodes';
import {SlangBehaviorSubject, SlangSubject} from '../custom/events';
import {AppModel} from './app';

export type LandscapeModelArgs = {};

export class LandscapeModel extends SlangNode {

    private blueprintAdded = new SlangSubject<BlueprintModel>('blueprint-added');
    private opened = new SlangBehaviorSubject<boolean>('opened', false);
    private selectedBlueprint = new SlangBehaviorSubject<BlueprintModel | null>('selected-blueprint', null);

    constructor(parent: AppModel, args: LandscapeModelArgs) {
        super(parent);
    }

    public findBlueprint(fullName: string): BlueprintModel | undefined {
        for (const blueprint of this.getChildNodes<BlueprintModel>([BlueprintModel])) {
            if (blueprint.getFullName() === fullName) {
                return blueprint;
            }
        }
    }

    public getBlueprints(): IterableIterator<BlueprintModel> {
        return this.getChildNodes<BlueprintModel>([BlueprintModel]);
    }

    // Actions

    public open() {
        if (!this.opened.getValue()) {
            this.opened.next(true);
        }
    }

    public close() {
        if (this.opened.getValue()) {
            this.opened.next(false);
        }
    }

    public createBlueprint(args: BlueprintModelArgs): BlueprintModel {    
        const blueprint = this.createChildNode<BlueprintModel, BlueprintModelArgs>(BlueprintModel, args);
        
        this.blueprintAdded.next(blueprint);

        const that = this;

        // Subscribe on selection to keep track over selected blueprint
        blueprint.subscribeSelectChanged(function (selected: boolean) {
            if (selected) {
                const selectedBlueprintOrNull = that.selectedBlueprint.getValue();
                if (selectedBlueprintOrNull !== null) {
                    selectedBlueprintOrNull.deselect();
                }
                that.selectedBlueprint.next(blueprint);
            } else {
                if (that.selectedBlueprint.getValue() === blueprint) {
                    that.selectedBlueprint.next(null);
                } else {
                    // This can happen if that.selectedBlueprint has already been set to the new value
                }
            }
        });

        return blueprint;
    }

    // Subscriptions

    public subscribeBlueprintAdded(cb: (bp: BlueprintModel) => void): void {
        this.blueprintAdded.subscribe(cb);
    }

    public subscribeOpenedChanged(cb: (opened: boolean) => void) {
        this.opened.subscribe(cb);
    }

}