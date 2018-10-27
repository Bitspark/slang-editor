import {PortModel} from "./port";

export class DelegateModel {
    constructor(private name: string, private portIn: PortModel, private portOut: PortModel) {
    }

    public getName(): string {
        return this.name;
    }

    public getPortIn(): PortModel | null {
        return this.portIn
    }

    public getPortOut(): PortModel | null {
        return this.portOut
    }
}
