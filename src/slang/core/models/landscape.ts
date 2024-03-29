import {SlangFileJson, UUID} from "../../definitions/api";
import {SlangNode} from "../abstract";
import {SlangBehaviorSubject, SlangSubjectTrigger} from "../abstract/utils/events";
import {blueprintModelToJson, loadBlueprints} from "../mapper";

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

	public findBlueprint(uuid: UUID): BlueprintModel | undefined {
		// TODO use type *uuid* for blueprint IDs
		const uuidDashCount = 5;
		if (uuid.indexOf(" ") >= 0 || uuid.split("-").length !== uuidDashCount) {
			// Valid uuid e.g.: "dc1aa556-d62e-4e07-adbb-53dc317481b0"
			throw Error(`given blueprint uuid is not valid: ${uuid}`);
		}
		return this.scanChildNode(BlueprintModel, (blueprint) => uuid === blueprint.uuid);
	}

	// Import and export

	public getDependencies(blueprint: BlueprintModel, args?: {onlyLocals: boolean}): IterableIterator<BlueprintModel> {
		const onlyLocals = Boolean(args?.onlyLocals)

		const remainingBlueprints: BlueprintModel[] = [blueprint];
		const dependencies = new Map<String, BlueprintModel>()

		while (remainingBlueprints.length > 0) {
			const currBp = remainingBlueprints.pop();
			if (!currBp || dependencies.has(currBp.uuid)) {
				continue;
			}

			if (onlyLocals && !currBp.isLocal()) {
				continue
			}

			dependencies.set(currBp.uuid, currBp)

			for (const op of currBp.getOperators()) {
				remainingBlueprints.push(op.getBlueprint());
			}
		}

		return dependencies.values()
	}

	public export(blueprint: BlueprintModel, args?: {onlyLocals: boolean}): SlangFileJson {
		/*
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
		 */

		return {
			blueprints: Object.fromEntries(
					Array
						.from(this.getDependencies(blueprint, args))
						.map(bp => [bp.uuid, blueprintModelToJson(bp)])
				),
			main: blueprint.uuid,
		};
	}

	public import(bundle: SlangFileJson): BlueprintModel {
		const blueprintJsonList = Object
			.keys(bundle.blueprints)
			.filter((bpId) => {
				const bp = this.findBlueprint(bpId)
				// allow override, if imported bp is new or would override a local blueprint
				return !bp || bp.isLocal()
			})
			.map((bpId) => bundle.blueprints[bpId]);
		loadBlueprints(this, {local: blueprintJsonList, library: [], elementary: []});

		const blueprint = this.findBlueprint(bundle.main);
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
