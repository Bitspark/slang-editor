import {PortModel} from "./port";
import {PortOwner} from "./blueprint";

export class DelegateModel implements PortOwner {
    private portIn: PortModel | null = null;
    private portOut: PortModel | null = null;

    constructor(private owner: PortOwner, private name: string) {
    }

    public getName(): string {
        return this.name;
    }

    public getIdentity(): string {
        return this.getOwner().getIdentity() + '.' + this.name;
    }

    public getOwner(): PortOwner {
        return this.owner;
    }

    public setPortIn(port: PortModel) {
        this.portIn = port;
    }

    public setPortOut(port: PortModel) {
        this.portOut = port;
    }

    public getPortIn(): PortModel | null {
        return this.portIn
    }

    public getPortOut(): PortModel | null {
        return this.portOut
    }
}
