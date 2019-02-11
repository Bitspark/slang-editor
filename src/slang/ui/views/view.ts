import {ComponentFactory} from "../factory";
import {ViewFrame} from "../frame";

export abstract class View {

	protected constructor(private readonly frame: ViewFrame, protected readonly factory: ComponentFactory) {
	}

	public abstract resize(width: number, height: number): void;

	public getFrame(): ViewFrame {
		return this.frame;
	}

}
