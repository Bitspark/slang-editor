import {SlangNode} from "../abstract/nodes";
import {SlangBehaviorSubject} from "../abstract/utils/events";

import {AppModel} from "./app";
import {BlueprintModel, BlueprintModelArgs} from "./blueprint";

// tslint:disable-next-line
export interface LandscapeModelArgs {
}

export class LandscapeModel extends SlangNode {

	private opened = new SlangBehaviorSubject<boolean>("opened", false);

	constructor(parent: AppModel, _args: LandscapeModelArgs) {
		super(parent);
	}

	public findBlueprint(uuid: string): BlueprintModel | undefined {
		if (uuid.indexOf(" ") >= 0 || uuid.split("-").length !== 5) {
			// Valid uuid e.g.: "dc1aa556-d62e-4e07-adbb-53dc317481b0"
			throw Error(`given blueprint uuid is not valid: ${uuid}`);
		}
		return this.scanChildNode(BlueprintModel, (blueprint) => uuid === blueprint.uuid);
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
