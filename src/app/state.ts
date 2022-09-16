import uuidv4 from "uuid/v4";
import { ApiService } from "./services";
import { SlangAspects } from "../slang/aspects";
import { PortDirection } from "../slang/core/abstract/port";
import { blueprintModelToJson, loadBlueprints } from "../slang/core/mapper";
import { AppModel, BlueprintModel } from "../slang/core/models";
import { BlueprintType } from "../slang/core/models/blueprint";
import { SlangType } from "../slang/definitions/type";
import { OperatorDataExt } from "../extensions/operators";

declare const APIURL: string;
const API = new ApiService(APIURL);

export class AppState {
	private static extensions = [
		OperatorDataExt,
	]

    private static initalized = false;

	public static readonly aspects = new SlangAspects();
	public static readonly appModel = AppModel.create("slang");
    public static readonly landscape = AppState.appModel.createLandscape();
	public static blueprints: BlueprintModel[] = [];

    public static currentBlueprint: BlueprintModel|null = null;

	public static init() {
        if (AppState.initalized) {
            return;
        }

		AppState.registerExtensions()
        AppState.subscribe()
		AppState.appModel.load()
	}

	private static registerExtensions() {
		AppState.extensions.forEach(extClass => extClass.register(AppState.appModel, AppState.aspects))
	}

	private static subscribe(): void {
		AppState.landscape.subscribeChildCreated(BlueprintModel, (blueprint) => {
			//AppState.blueprints.set(blueprint.uuid, blueprint)
			AppState.blueprints.push(blueprint)
		});

		AppState.appModel.subscribeLoadRequested(() => {
			return AppState.loadBlueprints()
		});

		AppState.appModel.subscribeStoreRequested((blueprint: BlueprintModel) => {
			AppState.storeBlueprint(blueprint);
		});

	}

	public static createEmptyBlueprint(): BlueprintModel {
		const newBlueprint = AppState.landscape.createBlueprint({
			uuid: uuidv4(),
			meta: {name: `Unnamed${new Date().getTime()}`},
			type: BlueprintType.Local,
		});
		newBlueprint.createPort({
			name: "",
			type: SlangType.newMap(),
			direction: PortDirection.In,
		});
		newBlueprint.createPort({
			name: "",
			type: SlangType.newMap(),
			direction: PortDirection.Out,
		});
		return newBlueprint;
	}

    public static async addOperator(blueprint: BlueprintModel) {
        if (!AppState.currentBlueprint) {
            return
        }

        AppState.currentBlueprint.createBlankOperator(blueprint, {position: {x: 0, y: 0}})
    }

	public static async loadBlueprints(): Promise<void> {
		loadBlueprints(AppState.landscape, await API.getBlueprints());
        return Promise.resolve();
	}
	
	public static storeBlueprint(blueprint: BlueprintModel): void {
		API.storeBlueprint(blueprintModelToJson(blueprint)).then(() => {
			return;
		});
	}
     
}