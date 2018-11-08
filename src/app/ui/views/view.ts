import {ViewFrame} from "../frame";

export abstract class View {

    protected constructor(private readonly frame: ViewFrame) {
    }

    public abstract resize(width: number, height: number): void;

    protected getFrame(): ViewFrame {
        return this.frame;
    }

}
