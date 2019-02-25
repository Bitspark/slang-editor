import "./common";

import "../styles/standalone.scss";

import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {BlueprintExporterApp} from "../apps/exporter/src/app";
import {OperatorDataApp} from "../apps/operators/src/app";
import {RouterApp} from "../apps/router/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {SLANG_ASPECTS} from "../slang/aspects";
import {AppModel} from "../slang/core/models/app";
import {Slang} from "../slang/slang";
import {COMPONENT_FACTORY} from "../slang/ui/components/factory";
import {ViewFrame} from "../slang/ui/frame";

function slangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const app = new Slang(appModel);
		const frame = new ViewFrame(el);
		app.addFrame(frame, true);

		new APIStorageApp(appModel, SLANG_ASPECTS, "http://localhost:5149/");
		new DeploymentApp(appModel, SLANG_ASPECTS, "http://localhost:5149/");
		new OperatorDataApp(appModel, SLANG_ASPECTS, COMPONENT_FACTORY);
		new AutoTriggerApp(appModel, SLANG_ASPECTS);
		new BlueprintExporterApp(appModel, SLANG_ASPECTS);

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
