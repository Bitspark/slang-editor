import uuidv4 from "uuid/v4";
import { ApiService } from "./services";
import { SlangAspects } from "../slang/aspects";
import { PortDirection } from "../slang/core/abstract/port";
import { blueprintModelToJson, loadBlueprints } from "../slang/core/mapper";
import { AppModel, BlueprintModel } from "../slang/core/models";
import { BlueprintType } from "../slang/core/models/blueprint";
import {SlangType, SlangTypeValue} from "../slang/definitions/type";
import { OperatorDataExt } from "../extensions/operators";

declare const APIURL: string;
const API = new ApiService(APIURL);

/*
	App:
		contains the current state of SlangEditorApp
		- all blueprints
		- blueprint in use --> editing/viewing

		bundles all required services for SlangEditorApp
		- load blueprint from backend
		- store blueprint to backend
		- run operator of blueprint
		- send data to running operator
		- receive data from operator

 */

export class AppState {
	private static extensions = [
		OperatorDataExt,
	]

    private static initalized = false;

	public static readonly aspects = new SlangAspects();
	public static readonly appModel = AppModel.create("slang");
    public static readonly landscape = AppState.appModel.createLandscape(); // Containing all blueprints

	private static _activeBlueprint: BlueprintModel|null;
	public static blueprints: BlueprintModel[] = [];
	public static blueprintsByUUID = new Map<String, BlueprintModel>()

	public static init() {
        if (AppState.initalized) {
            return;
        }

		AppState.registerExtensions()
        AppState.subscribe()
		AppState.appModel.load()
	}

	public static get activeBlueprint(): BlueprintModel|null {
		return this._activeBlueprint;
	}

	public static set activeBlueprint(blueprint: BlueprintModel|null) {
		if (this._activeBlueprint) {
			this._activeBlueprint.close()
		}

		if (blueprint) {
			blueprint.open();
		}
		this._activeBlueprint = blueprint;
	}

	private static registerExtensions() {
		AppState.extensions.forEach(extClass => extClass.register(AppState.appModel, AppState.aspects))
	}

	private static subscribe(): void {
		AppState.landscape.subscribeChildCreated(BlueprintModel, (blueprint) => {
			AppState.blueprintsByUUID.set(blueprint.uuid, blueprint)
			AppState.blueprints.push(blueprint)
		});

		AppState.appModel.subscribeLoadRequested( async () => {
			await AppState.loadBlueprints();
			await AppState.loadRunningOperator();
		});

		AppState.appModel.subscribeStoreRequested(async (blueprint: BlueprintModel) => {
			await AppState.storeBlueprint(blueprint);
		});
	}

	public static getBlueprint(uuid: string): BlueprintModel|null {
		const bp = AppState.blueprintsByUUID.get(uuid);
		return (bp)?bp:null;
	}

	public static createEmptyBlueprint(): BlueprintModel {
		// ABC
		const newBlueprint = AppState.landscape.createBlueprint({
			uuid: uuidv4(),
			meta: {name: `Unnamed${new Date().getTime()}`},
			type: BlueprintType.Local,
		});
		newBlueprint.createPort({
			name: "",
			type: SlangType.newUnspecified(),
			direction: PortDirection.In,
		});
		newBlueprint.createPort({
			name: "",
			type: SlangType.newUnspecified(),
			direction: PortDirection.Out,
		});
		return newBlueprint;
	}

	public static async runOperator(blueprint: BlueprintModel) {
		await AppState.storeBlueprint(blueprint);
		blueprint.runningOperator = await API.runOperator(blueprint)
	}

	public static async stopOperator(blueprint: BlueprintModel) {
		if (!blueprint.runningOperator) {
			return;
		}
		await API.stopOperator(blueprint.runningOperator)
		blueprint.runningOperator = null;
	}

	public static async sendData(blueprint: BlueprintModel, data: SlangTypeValue) {
		if (!blueprint.runningOperator) {
			return;
		}
		await API.sendData(blueprint.runningOperator, data)
	}

	private static async loadBlueprints(): Promise<void> {
		loadBlueprints(AppState.landscape, await API.getBlueprints());
	}

	private static async loadRunningOperator(): Promise<void> {
		const runningOperators = await API.getRunningOperators();

		runningOperators.forEach(({blueprint, handle, url}) => {
			const blueprintModel = this.getBlueprint(blueprint);

			if (!blueprintModel) {
				console.error("[LOAD_RUNNING_OPERATORS] no blueprint found for running operator:", blueprint, handle);
				return;
			}
			blueprintModel.runningOperator = {handle, url};
		});
	}

	private static async storeBlueprint(blueprint: BlueprintModel) {
		await API.storeBlueprint(blueprintModelToJson(blueprint));
	}

}
