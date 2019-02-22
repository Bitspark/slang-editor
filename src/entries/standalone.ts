import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {OperatorDataApp} from "../apps/operators/src/app";
import {RouterApp} from "../apps/router/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {SLANG_ASPECTS} from "../slang/aspects";
import {AppModel} from "../slang/core/models/app";
import {Slang} from "../slang/slang";
import {ComponentFactory} from "../slang/ui/factory";
import {ViewFrame} from "../slang/ui/frame";
// tslint:disable-next-line
import "../styles/standalone.scss";

// tslint:disable-next-line
import "./common";

function slangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const factory = new ComponentFactory();

		new APIStorageApp(appModel, factory, "http://localhost:5149/");
		new DeploymentApp(appModel, factory, "http://localhost:5149/");
		new OperatorDataApp(appModel, factory);
		new AutoTriggerApp(appModel, factory);

		const app = new Slang(appModel);
		const frame = new ViewFrame(el, factory);
		app.addFrame(frame, true);

		new APIStorageApp(appModel, SLANG_ASPECTS, "http://localhost:5149/");
		new DeploymentApp(appModel, SLANG_ASPECTS, "http://localhost:5149/");
		new OperatorDataApp(appModel, SLANG_ASPECTS, COMPONENT_FACTORY);
		new AutoTriggerApp(appModel, SLANG_ASPECTS);

		app.load().then(() => {
			const router = new RouterApp(appModel, SLANG_ASPECTS);
			router.checkRoute();
			resolve();
		});
	});
}

const studioEl = document.getElementById("slang-studio");
if (studioEl) {
	slangStudioStandalone(studioEl);
}
