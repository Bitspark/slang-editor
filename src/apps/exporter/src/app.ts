import {SlangApp} from "../../../slang/app";
import {BlueprintToolBoxType} from "../../../slang/aspects";
import {SlangSubject} from "../../../slang/core/abstract/utils/events";
import {BlueprintModel} from "../../../slang/core/models/blueprint";
import {PaperView} from "../../../slang/ui/views/paper-view";

export class BlueprintExporterApp extends SlangApp {

	private exportRequested = new SlangSubject<BlueprintModel>("exported-blueprint");

	protected onReady(): void {

		this.exportRequested.subscribe((blueprint: BlueprintModel) => {
			this.export(blueprint);
		});

		this.aspects!.registerBlueprintToolboxButton((_view: PaperView, blueprint: BlueprintModel): BlueprintToolBoxType | null => {
			return {
				label: "Export",
				onclick: () => {
					this.exportRequested.next(blueprint);
				},
			};
		});
	}

	protected export(blueprint: BlueprintModel): void {
		console.log("---> EXPORT", blueprint);
	}
}
