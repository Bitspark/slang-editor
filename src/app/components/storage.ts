import {LandscapeModel} from "../model/landscape";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {ApiService, BlueprintApiResponse, BlueprintDefApiResponse, TypeDefApiResponse, PortGroupApiResponse, PropertyApiResponse} from "../services/api";
import {BlueprintPortModel} from '../model/port';
import {BlueprintDelegateModel} from '../model/delegate';
import {SlangType, TypeModel} from "../model/type";
import {PropertyModel} from "../model/property";

export class StorageComponent {
    constructor(private landscape: LandscapeModel, private api: ApiService) {

    }

    private toSlangType(typeName: string): SlangType {
        const type = ({
            number: SlangType.Number,
            binary: SlangType.Binary,
            boolean: SlangType.Boolean,
            string: SlangType.String,
            trigger: SlangType.Trigger,
            primitive: SlangType.Primitive,
            generic: SlangType.Generic,
            stream: SlangType.Stream,
            map: SlangType.Map,
        } as  { [_: string]: SlangType })[typeName];

        if (type === null) {
            throw `unknown property type '${type}'`;
        }

        return type;
    }

    private createPort(typeDef: TypeDefApiResponse, owner: BlueprintModel | BlueprintDelegateModel, directionIn: boolean): BlueprintPortModel {
        const type = this.toSlangType(typeDef.type);
        const port = new BlueprintPortModel(null, owner, type, directionIn);
        switch (port.getType()) {
            case SlangType.Map:
                Object.keys(typeDef.map!).forEach((portName: string) => {
                    port.addMapSub(portName, this.createPort(typeDef.map![portName], owner, directionIn));
                });
                break;
            case SlangType.Stream:
                port.setStreamSub(this.createPort(typeDef.stream!, owner, directionIn));
                break;
        }

        return port;
    }

    private createTypeModel(typeDef: TypeDefApiResponse): TypeModel {
        const type = this.toSlangType(typeDef.type);
        const port = new TypeModel(null, type);
        switch (port.getType()) {
            case SlangType.Map:
                Object.keys(typeDef.map!).forEach((subName: string) => {
                    port.addMapSub(subName, this.createTypeModel(typeDef.map![subName]));
                });
                break;
            case SlangType.Stream:
                port.setStreamSub(this.createTypeModel(typeDef.stream!));
                break;
        }

        return port;
    }

    private setBlueprintServices(blueprint: BlueprintModel, services: PortGroupApiResponse) {
        const portInDef: TypeDefApiResponse = services["main"].in;
        const outPortDef: TypeDefApiResponse = services["main"].out;
        blueprint.setPortIn(this.createPort(portInDef, blueprint, true));
        blueprint.setPortOut(this.createPort(outPortDef, blueprint, false));
    }

    private setBlueprintDelegates(blueprint: BlueprintModel, delegates: PortGroupApiResponse) {
        Object.keys(delegates).forEach((delegateName: string) => {
            const delegate = blueprint.createDelegate(delegateName);
            delegate.setPortIn(this.createPort(delegates[delegateName].in, delegate, true));
            delegate.setPortOut(this.createPort(delegates[delegateName].out, delegate, false));
        });
    }

    private setBlueprintProperties(blueprint: BlueprintModel, properties: PropertyApiResponse) {
        Object.keys(properties).forEach((propertyName: string) => {
            blueprint.addProperty(new PropertyModel(propertyName, this.createTypeModel(properties[propertyName])));
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
                if (bpData.def.properties) {
                    this.setBlueprintProperties(blueprint, bpData.def.properties);
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
                                // console.log(sourcePort.getIdentity(), "==>", destinationPort.getIdentity());
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