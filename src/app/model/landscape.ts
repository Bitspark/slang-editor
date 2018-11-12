import {BlueprintModel, BlueprintModelArgs} from './blueprint';
import {SlangNode} from '../custom/nodes';
import {SlangBehaviorSubject} from '../custom/events';
import {AppModel} from './app';

export type LandscapeModelArgs = {};

export class LandscapeModel extends SlangNode {

    private opened = new SlangBehaviorSubject<boolean>('opened', false);

    constructor(parent: AppModel, args: LandscapeModelArgs) {
        super(parent);
    }

    public findBlueprint(fullName: string): BlueprintModel | undefined {
        return this.scanChildNode(BlueprintModel, blueprint => blueprint.getFullName() === fullName);
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
        return this.createChildNode(BlueprintModel, args);
    }

    // Subscriptions

    public subscribeOpenedChanged(cb: (opened: boolean) => void) {
        this.opened.subscribe(cb);
    }

}