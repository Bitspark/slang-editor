import {TypeModel} from "./type";

export class PropertyModel {
    public constructor(private name: string, private type: TypeModel) {
    }

    public getName(): string {
        return this.name;
    }

    public getType(): TypeModel {
        return this.type;
    }
}
