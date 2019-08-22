import {BlueprintModel} from "./core/models";
import {AppModel} from "./core/models/app";
import {ViewFrame} from "./ui/frame";
import {BlueprintView} from "./ui/views/blueprint";
import {LandscapeView} from "./ui/views/landscape";
import {PaperViewArgs} from "./ui/views/paper-view";

export class Slang {
	private readonly frames: ViewFrame[] = [];
	private outlet: ViewFrame | null = null;
	private defaultViewArgs: PaperViewArgs | null = null;

	constructor(private app: AppModel) {
	}

	public setDefaultViewArgs(defaultViewArgs: PaperViewArgs | null) {
		this.defaultViewArgs = defaultViewArgs;
	}

	public addFrame(frame: ViewFrame, outlet: boolean = false): void {
		this.frames.push(frame);
		if (outlet) {
			this.outlet = frame;
		}
	}

	public setOutlet(frame: ViewFrame): void {
		if (this.frames.indexOf(frame) === -1) {
			throw new Error(`outlet has to be owned by the app`);
		}
		this.outlet = frame;
	}

	public getOutlet(): ViewFrame | null {
		return this.outlet;
	}

	public getFrames(): Iterable<ViewFrame> {
		return this.frames.values();
	}

	public async load(): Promise<void> {
		this.subscribe();
		return this.app.load();
	}

	private subscribe(): void {
		this.app.subscribeOpenedBlueprintChanged((blueprint) => {
			if (!blueprint || !this.outlet) {
				return;
			}

			const viewArgs = this.defaultViewArgs || {
				editable: blueprint.isLocal(),
				hscrollable: true,
				vscrollable: true,
				descendable: true,
				runnable: true,
			};

			const view = new BlueprintView(this.outlet, blueprint, viewArgs);
			this.outlet.setView(view);
		});

		this.app.subscribeOpenedLandscapeChanged((landscape) => {
			if (!landscape || !this.outlet) {
				return;
			}
			const view = new LandscapeView(
				this.outlet,
				landscape,
				((bp) => bp.isLocal()) as (bp: BlueprintModel) => boolean);
			this.outlet.setView(view);
		});
	}
}
