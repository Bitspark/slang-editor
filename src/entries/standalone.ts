import "./common";

import "../styles/standalone.scss";

import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {OperatorDataApp} from "../apps/operators/src/app";
import {RouterApp} from "../apps/router/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {AppModel} from "../slang/model/app";
import {Slang} from "../slang/slang";
import {COMPONENT_FACTORY} from "../slang/ui/components/factory";
import {ViewFrame} from "../slang/ui/frame";

function slangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const app = new Slang(appModel);
		const frame = new ViewFrame(el);
		app.addFrame(frame, true);

		new APIStorageApp(appModel, COMPONENT_FACTORY, "http://localhost:5149/");
		new DeploymentApp(appModel, COMPONENT_FACTORY, "http://localhost:5149/");
		new OperatorDataApp(appModel, COMPONENT_FACTORY);
		new AutoTriggerApp(appModel, COMPONENT_FACTORY);

		app.load().then(() => {
			const router = new RouterApp(appModel, COMPONENT_FACTORY);
			router.checkRoute();
			resolve();
		});
	});
}

const studioEl = document.getElementById("slang-studio");
if (studioEl) {
	slangStudioStandalone(studioEl);
}
