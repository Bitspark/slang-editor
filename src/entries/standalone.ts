import "./common";

import "../styles/standalone.scss";

import {AppModel} from "../slang/model/app";
import {Slang} from "../slang/slang";
import {ViewFrame} from "../slang/ui/frame";
import {BlueprintModel} from "../slang/model/blueprint";
import {OperatorEvaluateApp} from "../apps/operator-evaluate/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {componentFactory} from "../slang/ui/components/factory";
import {RouterApp} from "../apps/router/src/app";

function SlangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>(resolve => {
		const appModel = AppModel.create("slang");
		const app = new Slang(appModel);
		const frame = new ViewFrame(el);
		app.addFrame(frame, true);

		appModel.subscribeDescendantCreated(BlueprintModel, bp => {
			let saveInterval: number | null;
			bp.subscribeOpenedChanged(open => {
				if (open) {
					saveInterval = setInterval(() => {
						bp.save();
					}, 1000);
				} else if (saveInterval) {
					clearInterval(saveInterval);
				}
			});
		});

		new APIStorageApp(appModel, componentFactory, "http://localhost:5149/");
		new DeploymentApp(appModel, componentFactory, "http://localhost:5149/");
		new OperatorEvaluateApp(appModel, componentFactory);

		app.load().then(() => {
			const router = new RouterApp(appModel, componentFactory);
			router.checkRoute();
			resolve();
		});
	});
}

const el = document.getElementById("slang-studio");
if (el) {
	SlangStudioStandalone(el);
}