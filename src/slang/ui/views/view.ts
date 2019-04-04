import {SlangAspects} from "../../aspects";
import {ComponentFactory} from "../factory";
import {ViewFrame} from "../frame";

export abstract class View {

	protected constructor(private readonly frame: ViewFrame) {
	}

	public abstract resize(width: number, height: number): void;

	public get aspects(): SlangAspects {
		return this.frame.getAspects();
	}

	public getFactory(): ComponentFactory {
		return this.aspects.factory;
	}

	public getAspects(): SlangAspects {
		return this.aspects;
	}

	public getFrame(): ViewFrame {
		return this.frame;
	}

}
