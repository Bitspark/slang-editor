import {TypeModel} from "./type";

export class GenericSpecifications {
    private genId2Type: Map<string, TypeModel>;

    public constructor(private genericIdentifiers: Array<string>) {
        this.genId2Type = new Map<string, TypeModel>();
    }

    public specify(genId: string, type: TypeModel): TypeModel {
        if (this.genericIdentifiers.indexOf(genId) < 0) {
            throw `unknown generic identifier ${genId}`;

        }
        this.genId2Type.set(genId, type);
        return type;
    }

    public get(genId: string): TypeModel | undefined {
        return this.genId2Type.get(genId);
    }
}
