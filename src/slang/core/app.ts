// tslint:disable:no-circular-imports

import {SlangNode} from "./abstract/nodes";
import {SlangBehaviorSubject, SlangSubject, SlangSubjectTrigger} from "./abstract/utils/events";
import {BlueprintModel} from "./blueprint";
import {LandscapeModel} from "./landscape";

export interface AppModelArgs { name: string; }

export class AppModel extends SlangNode {

	public static create(name: string): AppModel {
		return SlangNode.createRoot(AppModel, {name});
	}

	private openedBlueprint = new SlangBehaviorSubject<BlueprintModel | null>("opened-blueprint", null);
	private openedLandscape = new SlangBehaviorSubject<LandscapeModel | null>("opened-landscape", null);
	private ready = new SlangBehaviorSubject<boolean>("ready", false);
	private loadRequested = new SlangSubjectTrigger("load-requested");
	private storeRequested = new SlangSubject<BlueprintModel>("save-requested");

	private readonly landscape: LandscapeModel;
	private loading: Array<Promise<void>> = [];

	public constructor({}: AppModelArgs) {
		super(null);
		this.landscape = this.createChildNode(LandscapeModel, {});
		this.subscribeLandscape(this.landscape);
	}

	// Actions

	public load(): Promise<void> {
		return new Promise<void>(async (resolve) => {
			this.loadRequested.next();
			const loading = this.loading;
			this.loading = [];
			await Promise.all(loading);
			this.ready.next(true);
			resolve();
		});
	}

	// Subscriptions

	public subscribeOpenedBlueprintChanged(cb: (blueprint: BlueprintModel | null) => void) {
		this.openedBlueprint.subscribe(cb);
	}

	public subscribeOpenedLandscapeChanged(cb: (landscape: LandscapeModel | null) => void) {
		this.openedLandscape.subscribe(cb);
	}

	public subscribeReady(cb: (readyState: boolean) => void) {
		this.ready.subscribe(cb);
	}

	public subscribeLoadRequested(cb: () => Promise<void>) {
		this.loadRequested.subscribe(() => {
			this.loading.push(cb());
		});
	}

	public subscribeStoreRequested(cb: (blueprint: BlueprintModel) => void) {
		this.storeRequested.subscribe(cb);
	}

	private subscribeLandscape(landscape: LandscapeModel) {
		for (const blueprint of landscape.getChildNodes(BlueprintModel)) {
			this.subscribeBlueprint(blueprint);
		}
		landscape.subscribeChildCreated(BlueprintModel, (blueprint) => {
			this.subscribeBlueprint(blueprint);
		});
		landscape.subscribeOpenedChanged((opened) => {
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
		});
	}

	private subscribeBlueprint(blueprint: BlueprintModel) {
		blueprint.subscribeOpenedChanged((opened) => {
			if (opened) {
				const openedLandscape = this.openedLandscape.getValue();
				if (openedLandscape !== null) {
					openedLandscape.close();
				}
				blueprint.subscribeSaveChanges(() => {
					this.storeRequested.next(blueprint);
				});
				this.openedBlueprint.next(blueprint);
			} else {
				if (blueprint === this.openedBlueprint.getValue()) {
					this.openedBlueprint.next(null);
				}
			}
		});
	}

}
