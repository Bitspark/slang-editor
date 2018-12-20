import "./common";

import "../styles/standalone.scss";

import {AppModel} from "../app/model/app";
import {SlangApp} from "../app/app";
import {APIStoragePlugin} from "../app/plugins/storage";
import {RouterPlugin} from "../app/plugins/router";
import {ViewFrame} from "../app/ui/frame";
import {DeploymentPlugin} from "../app/plugins/deployment";
import {BlueprintModel} from "../app/model/blueprint";

function SlangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>(resolve => {
		const appModel = AppModel.create("slang");
		const app = new SlangApp(appModel);
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

		new APIStoragePlugin(appModel, "http://localhost:5149/");
		new DeploymentPlugin(appModel, "http://localhost:5149/");

		app.load().then(() => {
			const router = new RouterPlugin(appModel);
			router.checkRoute();
			resolve();
		});
	});
}

const el = document.getElementById("slang-studio");
if (el) {
	SlangStudioStandalone(el);
}