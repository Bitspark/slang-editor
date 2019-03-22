import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {OperatorDataApp} from "../apps/operators/src/app";
import {BlueprintShareApp} from "../apps/share/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {SLANG_ASPECTS} from "../slang/aspects";
import {AppModel} from "../slang/core/models/app";
import {LandscapeModel} from "../slang/core/models/landscape";
import {Slang} from "../slang/slang";
import {ComponentFactory} from "../slang/ui/factory";
import {ViewFrame} from "../slang/ui/frame";

// tslint:disable-next-line
import "../styles/standalone.scss";
// tslint:disable-next-line
import "./common";

declare const APIURL: string;

function slangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const factory = new ComponentFactory();

		const app = new Slang(appModel);
		const frame = new ViewFrame(el, factory);
		app.addFrame(frame, true);

		new APIStorageApp(appModel, SLANG_ASPECTS, APIURL);
		new DeploymentApp(appModel, SLANG_ASPECTS, APIURL);
		new OperatorDataApp(appModel, SLANG_ASPECTS, factory);
		new AutoTriggerApp(appModel, SLANG_ASPECTS);
		new BlueprintShareApp(appModel, SLANG_ASPECTS);

		app.load().then(() => {
			appModel.getChildNode(LandscapeModel)!.open();
			resolve();
		});
	});
}

const studioEl = document.getElementById("slang-studio");
if (studioEl) {
	slangStudioStandalone(studioEl);
}
