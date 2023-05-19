import uuidv4 from "uuid/v4";
import { ApiService } from "./services";
import { SlangAspects } from "../slang/aspects";
import { PortDirection } from "../slang/core/abstract/port";
import { loadBlueprints, createTypeModel } from "../slang/core/mapper";
import { AppModel, BlueprintModel } from "../slang/core/models";
import { BlueprintType } from "../slang/core/models/blueprint";
import {SlangType} from "../slang/definitions/type";
import { OperatorDataExt } from "../extensions/operators";
import {SlangFileJson} from "../slang/definitions/api";
import {GenericSpecifications} from "../slang/core/abstract/utils/generics";
import {PropertyAssignments} from "../slang/core/abstract/utils/properties";

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

	private static _currentBlueprint: BlueprintModel|null;
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

	public static get APIURL(): string {
		return API.url
	}

	public static get currentBlueprint(): BlueprintModel {
		if (!this._currentBlueprint) {
			throw Error("no current blueprint set")
		}

		return this._currentBlueprint;
	}

	public static set currentBlueprint(blueprint: BlueprintModel) {
		if (this._currentBlueprint) {
			this._currentBlueprint.close()
		}

		if (blueprint) {
			blueprint.open();
		}
		this._currentBlueprint = blueprint;
	}

	private static registerExtensions() {
		AppState.extensions.forEach(extClass => extClass.register(AppState.appModel, AppState.aspects))
	}

	private static subscribe(): void {
		AppState.landscape.subscribeChildCreated(BlueprintModel, (blueprint) => {
			AppState.blueprintsByUUID.set(blueprint.uuid, blueprint)
			AppState.blueprints = Array.from(AppState.blueprintsByUUID.values())
		});

		AppState.appModel.subscribeLoadRequested( async () => {
			await AppState.loadBlueprints();
			await AppState.loadRunningOperator();
		});

		/* DELETE
		AppState.appModel.subscribeStoreRequested(async (blueprint: BlueprintModel) => {
			// DELETE await AppState.saveBlueprint(blueprint);
			// Force page reload, to ensure all blueprints and operators are up-to-date
			window.location.reload();
		});
		 */
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

	public static async start(blueprint: BlueprintModel) {
		if (blueprint.hasGenerics() || blueprint.hasProperties()) {
			blueprint.start()
			return;
		}
		await AppState.run(blueprint)
	}

	public static async run(blueprint: BlueprintModel, generics?: GenericSpecifications, properties?: PropertyAssignments) {
		await this.saveBlueprint(blueprint)
		const runOp = await API.runOperator(blueprint, generics, properties)
		blueprint.run({
			handle: runOp.handle,
			url: runOp.url,
			in: createTypeModel(runOp.in),
			out: createTypeModel(runOp.out),
		})

		// Force page reload, to ensure all blueprints and operators are up-to-date
		//window.location.reload();
	}

	public static async stop(blueprint: BlueprintModel) {
		if (blueprint.runningOperator) {
			await API.stopOperator(blueprint.runningOperator);
		}
		blueprint.stop();
	}

	private static async loadBlueprints(): Promise<void> {
		loadBlueprints(AppState.landscape, await API.getBlueprints());
	}

	private static async loadRunningOperator(): Promise<void> {
		const runningOperators = await API.getRunningOperators();

		runningOperators.forEach((runOp) => {
			const {blueprint, handle} = runOp;
			const blueprintModel = this.getBlueprint(blueprint);

			if (!blueprintModel) {
				console.error("[LOAD_RUNNING_OPERATORS] no blueprint found for running operator:", blueprint, handle);
				return;
			}
			blueprintModel.runningOperator = {
				handle,
				url: runOp.url,
				in: createTypeModel(runOp.in),
				out: createTypeModel(runOp.out),
			};
		});
	}

	public static async saveBlueprint(blueprint: BlueprintModel, reload: boolean = false) {
		const slFile = this.landscape.export(blueprint, {onlyLocals: true})
		await API.saveBlueprint(slFile)
		if (reload) {
			window.location.reload();
		}
	}

	public static async importSlangFile(slangFile: SlangFileJson): Promise<BlueprintModel> {
		const bp = this.landscape.import(slangFile);
		await this.saveBlueprint(bp)
		return bp
	}

	public static exportSlangFile(blueprint: BlueprintModel): SlangFileJson {
		return this.landscape.export(blueprint);
	}

}
