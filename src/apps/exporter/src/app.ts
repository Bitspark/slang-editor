import {SlangApp} from "../../../slang/app";
import {BlueprintToolBoxType} from "../../../slang/aspects";
import {SlangSubject} from "../../../slang/core/abstract/utils/events";
import {blueprintModelToJSON} from "../../../slang/core/mapper";
import {BlueprintModel} from "../../../slang/core/models/blueprint";
import {
	BlueprintDefApiResponse,
	GenericSpecificationsApiResponse,
	PropertyAssignmentsApiResponse,
} from "../../../slang/definitions/api";
import {PaperView} from "../../../slang/ui/views/paper-view";

interface BlueprintExportJSON {
	main: string;
	args?: {
		properties: PropertyAssignmentsApiResponse;
		generics: GenericSpecificationsApiResponse;
	};
	blueprints: BlueprintDefApiResponse[];
}

export class BlueprintExporterApp extends SlangApp {

	private exportRequested = new SlangSubject<BlueprintModel>("blueprint-export");
	private downloadRequested = new SlangSubject<BlueprintExportJSON>("blueprint-download");

	protected onReady(): void {

		this.exportRequested.subscribe((blueprint: BlueprintModel) => {
			this.export(blueprint);
		});

		this.downloadRequested.subscribe((exported: BlueprintExportJSON) => {
			this.download(exported);
		});

		this.aspects!.registerBlueprintToolboxButton((_view: PaperView, blueprint: BlueprintModel): BlueprintToolBoxType[] => {
			return [{
				label: "Export",
				onclick: () => {
					this.exportRequested.next(blueprint);
				},
			}];
		});
	}

	protected export(blueprint: BlueprintModel): void {
		const exportedBlueprints = new Map<string, BlueprintDefApiResponse>();
		const remainingBlueprints: BlueprintModel[] = [blueprint];

		while (remainingBlueprints.length > 0) {
			const currBp = remainingBlueprints.pop();
			if (!currBp || exportedBlueprints.has(currBp.uuid)) {
				continue;
			}

			exportedBlueprints.set(currBp.uuid, blueprintModelToJSON(currBp));

			for (const op of currBp.getOperators()) {
				remainingBlueprints.push(op.getBlueprint());
			}
		}

		this.downloadRequested.next({
			main: blueprint.uuid,
			blueprints: Array.from(exportedBlueprints.values()),
		});

	}

	protected download(exported: BlueprintExportJSON) {
		const elem = document.createElement("a");
		elem.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(exported)));
		elem.setAttribute("download", `${exported.main}.slang.json`);

		elem.style.display = "none";
		document.body.appendChild(elem);

		elem.click();

		document.body.removeChild(elem);
	}
}
