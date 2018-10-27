import {LandscapeModel} from "../model/landscape";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {ApiService, BlueprintApiResponse, BlueprintDefApiResponse, PortApiResponse, PortGroupApiResponse} from "../services/api";
import {PortModel, PortType} from "../model/port";
import {DelegateModel} from "../model/delegate";

export class StorageComponent {
    constructor(private landscape: LandscapeModel, private api: ApiService) {

    }

    private createPort(portDef: PortApiResponse, directionIn: boolean): PortModel {
        const type: PortType = {
            number: PortType.Number,
            binary: PortType.Binary,
            boolean: PortType.Boolean,
            string: PortType.String,
            trigger: PortType.Trigger,
            primitive: PortType.Primitive,
            generic: PortType.Generic,
            stream: PortType.Stream,
            map: PortType.Map,
        }[portDef.type];

        if (type === null) {
            throw `unknown port type '${portDef.type}'`;
        }

        const port = new PortModel(null, type, directionIn);

        switch (port.getType()) {
            case PortType.Map:
                Object.keys(portDef.map!).forEach((portName: string) => {
                    port.addMapSubPort(portName, this.createPort(portDef.map![portName], directionIn))
                });
                break;
            case PortType.Stream:
                port.setStreamSubPort(this.createPort(portDef.stream!, directionIn))
        }

        return port;
    }

    private setBlueprintServices(blueprint: BlueprintModel, services: PortGroupApiResponse) {
        const portInDef: PortApiResponse = services["main"].in;
        const outPortDef: PortApiResponse = services["main"].out;
        blueprint.setPortIn(this.createPort(portInDef, true));
        blueprint.setPortOut(this.createPort(outPortDef, false));
    }

    private setBlueprintDelegates(blueprint: BlueprintModel, delegates: PortGroupApiResponse) {
        Object.keys(delegates).forEach((delegateName: string) => {
            blueprint.createDelegate(
                delegateName,
                this.createPort(delegates[delegateName].in, true),
                this.createPort(delegates[delegateName].out, false),
            );
        });
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
                this.setBlueprintServices(blueprint, bpData.def.services);
                if (bpData.def.delegates) {
                    this.setBlueprintDelegates(blueprint, bpData.def.delegates);
                }
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