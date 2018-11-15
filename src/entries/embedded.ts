import "./common";

import "../styles/embedded.scss";

import {AppModel} from "../app/model/app";
import {SlangApp} from "../app/app";
import {StaticStoragePlugin} from "../app/plugins/storage";
import {ViewFrame} from "../app/ui/frame";
import {LandscapeModel} from "../app/model/landscape";

export function SlangStudioEmbedded(el: HTMLElement, blueprintFullName: string): Promise<void> {
	return new Promise<void>(resolve => {
		const appModel = AppModel.create(`embedded-${blueprintFullName}`);
		const app = new SlangApp(appModel);
		app.addFrame(new ViewFrame(el), true);
		app.addPlugin(new StaticStoragePlugin(appModel, "https://files.bitspark.de/slang-operators/slang-definitions.json"));

		app.load().then(() => {
			const blueprint = appModel.getChildNode([LandscapeModel])!.findBlueprint(blueprintFullName);
			if (blueprint) {
				blueprint.open();
			} else {
				console.error(`blueprint ${blueprintFullName} could not be found`);
			}
			resolve();
		});
	});
}

const elements = document.getElementsByClassName("slang-embedded");
for (const el of elements) {
	if (el instanceof HTMLElement) {
		SlangStudioEmbedded(el, el.dataset["blueprint"] as string);
	}
}