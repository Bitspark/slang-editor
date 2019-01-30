import "./common";

import "../styles/standalone.scss";

import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {OperatorDataApp} from "../apps/operators/src/app";
import {RouterApp} from "../apps/router/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {AppModel} from "../slang/model/app";
import {Slang} from "../slang/slang";
import {componentFactory} from "../slang/ui/components/factory";
import {ViewFrame} from "../slang/ui/frame";

function SlangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const app = new Slang(appModel);
		const frame = new ViewFrame(el);
		app.addFrame(frame, true);

		new APIStorageApp(appModel, componentFactory, "http://localhost:5149/");
		new DeploymentApp(appModel, componentFactory, "http://localhost:5149/");
		new OperatorDataApp(appModel, componentFactory);
		new AutoTriggerApp(appModel, componentFactory);

		app.load().then(() => {
			const router = new RouterApp(appModel, componentFactory);
			router.checkRoute();
			resolve();
		});
	});
}

const element = document.getElementById("slang-studio");
if (element) {
	SlangStudioStandalone(element);
}
