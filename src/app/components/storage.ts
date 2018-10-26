import {LandscapeModel} from "../model/landscape";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {ApiService, BlueprintApiResponse, BlueprintDefApiResponse, PortApiResponse} from "../services/api";
import {PortModel, PortType} from "../model/port";

export class StorageComponent {
    constructor(private landscape: LandscapeModel, private api: ApiService) {

    }

    private createPort(portDef: PortApiResponse): PortModel {
        const type: PortType | null = ({
            number: PortType.Number,
            binary: PortType.Binary,
            boolean: PortType.Boolean,
            string: PortType.String,
            trigger: PortType.Trigger,
            primitive: PortType.Primitive,
            generic: PortType.Generic,
            stream: PortType.Stream,
            map: PortType.Map,
        } as any)[portDef.type];

        if (type === null) {
            throw `unknown port type '${portDef.type}'`;
        }

        const p = new PortModel(type);

        switch (p.getType()) {
            case PortType.Map:
                Object.keys(portDef.map!).forEach((portName: string) => {
                    p.addPort(portName, this.createPort(portDef.map![portName]))
                });
                break;
            case PortType.Stream:
                p.setPort(this.createPort(portDef.stream!))

        }

        return p;
    }

    public async load(): Promise<void> {
        const bpDataList: Array<BlueprintApiResponse> = await this.api.getBlueprints();
        return new Promise<void>(resolve => {

            const blueprintToOperator = new Map<BlueprintModel, BlueprintDefApiResponse>();

            // 1) Add Blueprints
            bpDataList.forEach(bpData => {
                const type: BlueprintType | null = ({
                    local: BlueprintType.Local,
                    library: BlueprintType.Library,
                    elementary: BlueprintType.Elementary,
                } as any)[bpData.type];

                if (type === null) {
                    throw `unknown blueprint type '${bpData.type}'`;
                }
                const blueprint = this.landscape.createBlueprint(bpData.name, type);
                const inPortDef: PortApiResponse = bpData.def.services["main"].in;
                const outPortDef: PortApiResponse = bpData.def.services["main"].out;
                blueprint.setPortIn(this.createPort(inPortDef));
                blueprint.setPortOut(this.createPort(outPortDef));
                const def = bpData.def;

                blueprintToOperator.set(blueprint, def);
            });

            // 2) Add Operators. Use previously defined Blueprints for assigning Operator.blueprint
            blueprintToOperator.forEach((bpDef: BlueprintDefApiResponse, outerBlueprint: BlueprintModel) => {
                if (bpDef.operators) {
                    Object.keys(bpDef.operators).forEach((opName: string) => {
                        const opData = bpDef.operators[opName];
                        const blueprint = this.landscape.findBlueprint(opData.operator);
                        if (!blueprint) {
                            throw `unknown blueprint '${opData.operator}'`;
                        }
                        outerBlueprint.createOperator(opName, blueprint);
                    });
                }
            });

            resolve();
        });
    }
}