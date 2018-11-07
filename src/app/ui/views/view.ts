import {ViewFrame} from "../cavas";

export abstract class View {

    protected constructor(private readonly frame: ViewFrame) {
    }

    public abstract resize(width: number, height: number): void;

    protected getFrame(): ViewFrame {
        return this.frame;
    }

}
