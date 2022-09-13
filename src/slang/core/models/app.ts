import {SlangNode} from "../abstract";
import {SlangBehaviorSubject} from "../abstract/utils/events";

import {LandscapeModel} from "./landscape";

export interface AppModelArgs {
	name: string;
}

export class AppModel extends SlangNode {
	public static create(name: string): AppModel {
		return SlangNode.createRoot(AppModel, {name});
	}

	private ready = new SlangBehaviorSubject<boolean>("ready", false);
	/*
	private openedBlueprint = new SlangBehaviorSubject<BlueprintModel | null>("opened-blueprint", null);
	private openedLandscape = new SlangBehaviorSubject<LandscapeModel | null>("opened-landscape", null);
	private loadRequested = new SlangSubjectTrigger("load-requested");
	private storeRequested = new SlangSubject<BlueprintModel>("save-requested");
	*/

	public constructor({}: AppModelArgs) {
		super(null);
		this.ready.next(true);
	}

	// Actions
	public createLandscape(): LandscapeModel {
		return this.createChildNode(LandscapeModel, {});
	}

	// Subscriptions
	public subscribeReady(cb: (readyState: boolean) => void) {
		this.ready.subscribe(cb);
	}
}
