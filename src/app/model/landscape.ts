import {BlueprintModel, BlueprintType} from "./blueprint";
import {BehaviorSubject, Subject} from "rxjs";
import {SlangNode} from "../custom/nodes";
import {AppModel} from "./app";

export class LandscapeModel extends SlangNode {

    private blueprintAdded = new Subject<BlueprintModel>();
    private blueprintRemoved = new Subject<BlueprintModel>();
    private opened = new BehaviorSubject<boolean>(false);

    private blueprints: Array<BlueprintModel> = [];
    private selectedBlueprint = new BehaviorSubject<BlueprintModel | null>(null);

    constructor(private root: AppModel) {
        super();
    }

    public createBlueprint(fullName: string, type: BlueprintType): BlueprintModel {
        const blueprint = new BlueprintModel(this, fullName, type);
        return blueprint;
    }

    public findBlueprint(fullName: string): BlueprintModel | undefined {
        return this.blueprints.find((each: BlueprintModel) => {
            return each.getFullName() == fullName;
        });
    }

    public getBlueprints(): IterableIterator<BlueprintModel> {
        return this.blueprints.values();
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

    public subscribeSelectionChanged(cb: (blueprint: BlueprintModel | null) => void): void {
        this.selectedBlueprint.subscribe(cb);
    }

    public subscribeOpenedChanged(cb: (opened: boolean) => void) {
        this.opened.subscribe(cb);
    }

    // Slang tree

    getChildNodes(): IterableIterator<BlueprintModel> {
        const children: Array<BlueprintModel> = [];
        for (const blueprint of this.blueprints) {
            children.push(blueprint);
        }
        return children.values();
    }

    getParentNode(): SlangNode {
        return this.root;
    }

    getIdentity(): string {
        return "landscape";
    }

}