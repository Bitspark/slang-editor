import "./common";

import "../styles/standalone.scss";

import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {OperatorDataApp} from "../apps/operators/src/app";
import {RouterApp} from "../apps/router/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {AppModel} from "../slang/core/models/app";
import {Slang} from "../slang/slang";
import {ComponentFactory} from "../slang/ui/factory";
import {ViewFrame} from "../slang/ui/frame";

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

		app.load().then(() => {
			const router = new RouterApp(appModel, factory);
			router.checkRoute();
			resolve();
		});
	});
}

const studioEl = document.getElementById("slang-studio");
if (studioEl) {
	slangStudioStandalone(studioEl);
}
