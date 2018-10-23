import {BlueprintModel} from './blueprint';
import {BehaviorSubject, Subject} from 'rxjs';

export class LandscapeModel {

    private blueprintAdded = new Subject<BlueprintModel>();
    private blueprintRemoved = new Subject<BlueprintModel>();

    private blueprints: Array<BlueprintModel> = [];
    private selectedBlueprint = new BehaviorSubject<BlueprintModel | null>(null);

    // Actions

    public addBlueprint(blueprint: BlueprintModel): boolean {
        this.blueprints.push(blueprint);
        this.blueprintAdded.next(blueprint);

        const that = this;

        // Subscribe on deletion of blueprint to remove from blueprints array
        blueprint.subscribeDeleted(function () {
            that.removeBlueprint(blueprint);
            that.blueprintRemoved.next(blueprint);
        });

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

        return true;
    }

    private removeBlueprint(blueprint: BlueprintModel): boolean {
        const index = this.blueprints.indexOf(blueprint);
        if (index === -1) {
            return false;
        }
        this.blueprints.splice(index, 1);
        return true;
    }

    // Subscriptions

    public subscribeBlueprintAdded(cb: (bp: BlueprintModel) => void): void {
        this.blueprintAdded.subscribe(cb);
    }

    public subscribeBlueprintRemoved(cb: (bp: BlueprintModel) => void): void {
        this.blueprintRemoved.subscribe(cb);
    }

    public subscribeSelectionChanged(cb: (blueprint: BlueprintModel) => void): void {
        this.selectedBlueprint.subscribe(cb);
    }

}