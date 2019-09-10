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
