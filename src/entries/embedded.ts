// tslint:disable-next-line
import "../styles/embedded.scss";

// tslint:disable-next-line
import {StaticStorageApp} from "../apps/storage/src/app";
import {SlangAspects} from "../slang/aspects";
import {AppModel} from "../slang/core/models/app";
import {LandscapeModel} from "../slang/core/models/landscape";
import {Slang} from "../slang/slang";
import {ViewFrame} from "../slang/ui/frame";

export function slangStudioEmbedded(el: HTMLElement, blueprintName: string): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create(`embedded-${blueprintName}`);
		const aspects = new SlangAspects();

		const app = new Slang(appModel);

		app.addFrame(new ViewFrame(el, aspects), true);
		new StaticStorageApp(appModel, aspects, "https://files.bitspark.de/slang-operators/slang-definitions.json");

		app.load().then(() => {
			const blueprint = appModel.getChildNode([LandscapeModel])!.findBlueprint(blueprintName);
			if (blueprint) {
				blueprint.open();
			} else {
				console.error(`blueprint ${blueprintName} could not be found`);
			}
			resolve();
		});
	});
}

const elements = document.getElementsByClassName("slang-embedded");
for (const el of elements) {
	if (el instanceof HTMLElement) {
		slangStudioEmbedded(el, el.dataset.blueprint as string);
	}
}
