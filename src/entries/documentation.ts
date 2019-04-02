// tslint:disable-next-line
import "./common";

// tslint:disable-next-line
import "../styles/embedded.scss";

import {OperatorDataApp} from "../apps/operators/app";
import {BlueprintShareApp} from "../apps/share/src/app";
import {SlangAspects} from "../slang/aspects";
import {loadBlueprints} from "../slang/core/mapper";
import {AppModel} from "../slang/core/models/app";
import {LandscapeModel} from "../slang/core/models/landscape";
import {BlueprintJson, BlueprintsJson} from "../slang/definitions/api";
import {Slang} from "../slang/slang";
import {ViewFrame} from "../slang/ui/frame";

(window as any).startSlang = () => {
	const appModel = AppModel.create(`embedded-slang`);
	const app = new Slang(appModel);
	const aspects = new SlangAspects();

	app.setDefaultViewArgs({
		editable: false,
		descendable: false,
		hscrollable: false,
		vscrollable: false,
	});

	const blueprints: BlueprintsJson = {elementary: [], library: [], local: []};

	for (const el of document.querySelectorAll(`script[type="text/slang"]`)) {
		if (!(el instanceof HTMLScriptElement)) {
			continue;
		}

		const blueprintId = el.dataset.operator as string;
		const blueprintType = el.dataset.type as string;
		const blueprintDef = JSON.parse(el.innerText) as BlueprintJson;

		if (blueprintDef.id !== blueprintId) {
			throw new Error(`blueprint ids don't match: ${blueprintId} !== ${blueprintDef.id}`);
		}

		switch (blueprintType) {
			case "elementary":
				blueprints.elementary.push(blueprintDef);
				break;
			case "library":
				blueprints.library.push(blueprintDef);
				break;
			case "local":
				blueprints.local.push(blueprintDef);
				break;
		}
	}

	loadBlueprints(appModel.getChildNode(LandscapeModel)!, blueprints);

	new OperatorDataApp(appModel, aspects);
	new BlueprintShareApp(appModel, aspects);

	for (const el of document.getElementsByClassName("slang-embedded")) {
		if (!(el instanceof HTMLElement)) {
			continue;
		}

		const blueprintId = el.dataset.operator as string;

		app.addFrame(new ViewFrame(el, aspects), true);
		app.load().then(() => {
			const blueprint = appModel.getChildNode([LandscapeModel])!.findBlueprint(blueprintId);
			if (blueprint) {
				blueprint.open();
			} else {
				console.error(`blueprint ${blueprintId} could not be found`);
			}
		});
	}
};
