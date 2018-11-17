import {BlueprintModel} from "./blueprint";
import {LandscapeModel} from "./landscape";
import {SlangNode} from "../custom/nodes";
import {SlangBehaviorSubject, SlangSubjectTrigger} from "../custom/events";

export type AppModelArgs = { name: string };

export class AppModel extends SlangNode {

	private openedBlueprint = new SlangBehaviorSubject<BlueprintModel | null>("opened-blueprint", null);
	private openedLandscape = new SlangBehaviorSubject<LandscapeModel | null>("opened-landscape", null);
	private loadRequested = new SlangSubjectTrigger("load-requested");

	private readonly name: string;
	private loading: Array<Promise<void>> = [];

	public constructor({name}: AppModelArgs) {
		super(null);
		this.name = name;
		const landscape = this.createChildNode(LandscapeModel, {});
		this.subscribeLandscape(landscape);
	}

	public static create(name: string): AppModel {
		return SlangNode.createRoot(AppModel, {name});
	}

	private subscribeLandscape(landscape: LandscapeModel) {
		for (const blueprint of landscape.getChildNodes(BlueprintModel)) {
			this.subscribeBlueprint(blueprint);
		}
		landscape.subscribeChildCreated(BlueprintModel, blueprint => {
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
		});
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