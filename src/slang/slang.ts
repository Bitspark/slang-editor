import "../styles/studio.scss";

import {AppModel} from "./core/models/app";
import {BlueprintModel, BlueprintType} from "./core/models/blueprint";
import {ViewFrame} from "./ui/frame";
import {BlueprintView} from "./ui/views/blueprint";
import {LandscapeView} from "./ui/views/landscape";

export class Slang {

	private readonly frames: ViewFrame[] = [];
	private outlet: ViewFrame | null = null;

	constructor(private app: AppModel) {
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

	public async load(): Promise<void> {
		this.subscribe();
		return this.app.load();
	}

	private subscribe(): void {
		this.app.subscribeOpenedBlueprintChanged((blueprint) => {
			if (blueprint !== null && this.outlet) {
				const view = new BlueprintView(this.outlet, blueprint);
				this.outlet.setView(view);
			}
		});

		this.app.subscribeOpenedLandscapeChanged((landscape) => {
			if (landscape !== null && this.outlet) {
				const view = new LandscapeView(
					this.outlet,
					landscape,
					((bp) => bp.getType() === BlueprintType.Local) as (bp: BlueprintModel) => boolean);
				this.outlet.setView(view);
			}
		});
	}

}
