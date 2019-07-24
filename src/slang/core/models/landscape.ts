import {BlueprintJson, BlueprintsJson, SlangBundle} from "../../definitions/api";
import {SlangNode} from "../abstract/nodes";
import {SlangBehaviorSubject, SlangSubjectTrigger} from "../abstract/utils/events";
import {BlueprintExistsError, blueprintModelToJson, loadBlueprints} from "../mapper";

import {AppModel} from "./app";
import {BlueprintModel, BlueprintModelArgs} from "./blueprint";

// tslint:disable-next-line
export interface LandscapeModelArgs {
}

export class LandscapeModel extends SlangNode {

	private opened = new SlangBehaviorSubject<boolean>("opened", false);
	private uploadRequested = new SlangSubjectTrigger("upload-requested");

	constructor(parent: AppModel, _args: LandscapeModelArgs) {
		super(parent);
	}

	public findBlueprint(uuid: string): BlueprintModel | undefined {
		const uuidDashCount = 5;
		if (uuid.indexOf(" ") >= 0 || uuid.split("-").length !== uuidDashCount) {
			// Valid uuid e.g.: "dc1aa556-d62e-4e07-adbb-53dc317481b0"
			throw Error(`given blueprint uuid is not valid: ${uuid}`);
		}
		return this.scanChildNode(BlueprintModel, (blueprint) => uuid === blueprint.uuid);
	}

	// Import and export

	public exportBundle(mainId: string): SlangBundle {
		const mainBp = this.findBlueprint(mainId);
		if (!mainBp) {
			throw new BundleError(mainId);
		}

		const blueprints: { [id: string]: BlueprintJson } = {};
		const remainingBlueprints: BlueprintModel[] = [mainBp];

		while (remainingBlueprints.length > 0) {
			const currBp = remainingBlueprints.pop();
			if (!currBp || blueprints.hasOwnProperty(currBp.uuid)) {
				continue;
			}

			blueprints[currBp.uuid] = blueprintModelToJson(currBp);

			for (const op of currBp.getOperators()) {
				remainingBlueprints.push(op.getBlueprint());
			}
		}

		return {
			blueprints,
			main: mainId,
		};
	}

	public loadBundle(bundle: SlangBundle): BlueprintModel {
		const blueprintsJson: BlueprintsJson = {
			elementary: [],
			library: [],
			local: [],
		};

		const uuids = Object.keys(bundle.blueprints);
		for (const uuid of uuids) {
			const bpDef = bundle.blueprints[uuid];
			blueprintsJson.local.push(bpDef);
		}

		try {
			loadBlueprints(this, blueprintsJson);
		} catch (e) {
			if (e instanceof BlueprintExistsError) {
				// Just ignore this for now
			} else {
				throw e;
			}
		}

		const blueprint = this.scanChildNode(BlueprintModel, (bp) => bp.uuid === bundle.main);
		if (!blueprint) {
			throw new BundleError(bundle.main);
		}

		return blueprint;
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

	public upload() {
		this.uploadRequested.next();
	}

	// Subscriptions

	public subscribeUploadRequested(cb: () => void) {
		this.uploadRequested.subscribe(cb);
	}

	public subscribeOpenedChanged(cb: (opened: boolean) => void) {
		this.opened.subscribe(cb);
	}

}

// Exceptions

export class BundleError extends Error {

	constructor(id: string) {
		super(`Corrupt blueprint detected, blueprint ${id} does not exist`);
	}

}
