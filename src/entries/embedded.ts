import "./common";

import "../styles/embedded.scss";

import {StaticStorageApp} from "../apps/storage/src/app";
import {AppModel} from "../slang/core/models/app";
import {LandscapeModel} from "../slang/core/models/landscape";
import {Slang} from "../slang/slang";
import {COMPONENT_FACTORY} from "../slang/ui/components/factory";
import {ViewFrame} from "../slang/ui/frame";

export function slangStudioEmbedded(el: HTMLElement, blueprintName: string): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create(`embedded-${blueprintName}`);
		const app = new Slang(appModel);
		app.addFrame(new ViewFrame(el), true);
		new StaticStorageApp(appModel, COMPONENT_FACTORY, "https://files.bitspark.de/slang-operators/slang-definitions.json");

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
