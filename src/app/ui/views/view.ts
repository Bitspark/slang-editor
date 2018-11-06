import {HTMLCanvas} from "../cavas";

export abstract class View {

    protected constructor(private readonly canvas: HTMLCanvas) {
    }

    public abstract resize(width: number, height: number): void;

    protected getCanvas(): HTMLCanvas {
        return this.canvas;
    }

}
