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

        const port = new PortModel(type);

        switch (port.getType()) {
            case PortType.Map:
                Object.keys(portDef.map!).forEach((portName: string) => {
                    port.addMapSubPort(portName, this.createPort(portDef.map![portName]))
                });
                break;
            case PortType.Stream:
                port.setStreamSubPort(this.createPort(portDef.stream!))

        }

        return port;
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
            
            // 3) Connect operator and blueprint ports
            blueprintToOperator.forEach((bpDef: BlueprintDefApiResponse, outerBlueprint: BlueprintModel) => {
                if (bpDef.connections) {
                    Object.keys(bpDef.connections).forEach((sourcePortReference: string) => {
                        const destinationPortReferences = bpDef.connections[sourcePortReference];
                        for (const destinationPortReference of destinationPortReferences) {
                            // Connect sourcePortReference -> destinationPortReference
                            try {
                                const sourcePort = outerBlueprint.resolvePortReference(sourcePortReference);
                                const destinationPort = outerBlueprint.resolvePortReference(destinationPortReference);

                                if (!sourcePort) {
                                    throw `source port ${sourcePortReference} of blueprint ${outerBlueprint.getFullName()} cannot be resolved`;
                                }
                                if (!destinationPort) {
                                    throw `destination port ${destinationPortReference} of blueprint ${outerBlueprint.getFullName()} cannot be resolved`;
                                }

                                sourcePort.connect(destinationPort);
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    });
                }
            });

            resolve();
        });
    }
}