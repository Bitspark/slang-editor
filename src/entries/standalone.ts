// tslint:disable-next-line
import "../styles/standalone.scss";

// tslint:disable-next-line
import {AutoTriggerApp} from "../apps/autotrigger/src/app";
import {DeploymentApp} from "../apps/deployment/src/app";
import {OperatorDataApp} from "../apps/operators/app";
import {BlueprintShareApp} from "../apps/share/src/app";
import {APIStorageApp} from "../apps/storage/src/app";
import {SlangAspects} from "../slang/aspects";
import {AppModel} from "../slang/core/models/app";
import {LandscapeModel} from "../slang/core/models/landscape";
import {ApiService} from "../slang/definitions/api";
import {Slang} from "../slang/slang";
import {ViewFrame} from "../slang/ui/frame";

declare const APIURL: string;

function slangStudioStandalone(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const aspects = new SlangAspects();
		const app = new Slang(appModel);
		const frame = new ViewFrame(el, aspects);
		app.addFrame(frame, true);

		const api = new ApiService(APIURL);
		api.subscribeConnected(() => {
			console.info("connected");
		});
		api.subscribeReconnecting(() => {
			console.info("reconnecting");
		});
		api.subscribeDisconnected(() => {
			console.info("disconnected");
		});
		api.subscribeReconnected(() => {
			console.info("reconnected");
		});

		new APIStorageApp(appModel, aspects, api);
		new DeploymentApp(appModel, aspects, api);
		new OperatorDataApp(appModel, aspects);
		new AutoTriggerApp(appModel, aspects);
		new BlueprintShareApp(appModel, aspects);

		app.load().then(() => {
			const mainLandscape = appModel.getChildNode(LandscapeModel)!;
			mainLandscape.open();

			if (gotoLandEl) {
				gotoLandEl.style.display = "none";

				gotoLandEl.onclick = () => {
					mainLandscape.open();
				};

				appModel.subscribeOpenedBlueprintChanged((blueprint) => {
					gotoLandEl.style.display = blueprint ? "" : "none";
				});
			}

			resolve();
		});

	});
}

// prevent browser history back
history.pushState(null, document.title, location.href);
window.addEventListener("popstate", () => {
	history.pushState(null, document.title, location.href);
});

const studioEl = document.getElementById("slang-studio");
const gotoLandEl = document.getElementById("sl-nav-goto-landscape");
if (studioEl) {
	slangStudioStandalone(studioEl);
}
