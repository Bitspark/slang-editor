import {SlangAspects} from "../../aspects";
import {ComponentFactory} from "../factory";
import {ViewFrame} from "../frame";

export abstract class View {

	protected constructor(private readonly frame: ViewFrame, public readonly aspects: SlangAspects) {
	}

	public abstract resize(width: number, height: number): void;

	public getFactory(): ComponentFactory {
		return this.aspects.factory;
	}

	public getFrame(): ViewFrame {
		return this.frame;
	}

}
