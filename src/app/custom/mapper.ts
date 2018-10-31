import {BlueprintModel, BlueprintType} from '../model/blueprint';
import {
    BlueprintApiResponse,
    BlueprintDefApiResponse,
    GenericSpecificationsApiResponse,
    PortGroupApiResponse,
    PropertyApiResponse,
    PropertyAssignmentsApiResponse,
    TypeDefApiResponse
} from './api';
import {LandscapeModel} from '../model/landscape';
import {BlueprintDelegateModel} from '../model/delegate';
import {BlueprintPortModel, PortDirection} from '../model/port';
import {PropertyAssignments, PropertyModel} from "../model/property";
import {SlangType, TypeModel} from "../model/type";
import {GenericSpecifications} from "../model/generic";

function toSlangType(typeName: string): SlangType {
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

function setBlueprintDelegates(blueprint: BlueprintModel, delegates: PortGroupApiResponse) {
    Object.keys(delegates).forEach((delegateName: string) => {
        const delegate = blueprint.createDelegate(delegateName);
        delegate.setPortIn(createPort(delegates[delegateName].in, delegate, PortDirection.In));
        delegate.setPortOut(createPort(delegates[delegateName].out, delegate, PortDirection.Out));
    });
}

function createPort(typeDef: TypeDefApiResponse, owner: BlueprintModel | BlueprintDelegateModel, direction: PortDirection): BlueprintPortModel {
    const port = new BlueprintPortModel(null, owner, toSlangType(typeDef.type), direction);
    switch (port.getType()) {
        case SlangType.Map:
            Object.keys(typeDef.map!).forEach((portName: string) => {
                port.addMapSub(portName, createPort(typeDef.map![portName], owner, direction));
            });
            break;
        case SlangType.Stream:
            port.setStreamSub(createPort(typeDef.stream!, owner, direction));
            break;
        case SlangType.Generic:
            port.setGenericIdentifier(typeDef.generic!);
            break;
    }
    return port;
}

function createTypeModel(typeDef: TypeDefApiResponse): TypeModel {
    const type = new TypeModel(null, toSlangType(typeDef.type));
    switch (type.getType()) {
        case SlangType.Map:
            Object.keys(typeDef.map!).forEach((subName: string) => {
                type.addMapSub(subName, createTypeModel(typeDef.map![subName]));
            });
            break;
        case SlangType.Stream:
            type.setStreamSub(createTypeModel(typeDef.stream!));
            break;
        case SlangType.Generic:
            type.setGenericIdentifier(typeDef.generic!);
            break;
    }
    return type;
}

function setBlueprintServices(blueprint: BlueprintModel, services: PortGroupApiResponse) {
    const portInDef: TypeDefApiResponse = services["main"].in;
    const outPortDef: TypeDefApiResponse = services["main"].out;
    blueprint.setPortIn(createPort(portInDef, blueprint, PortDirection.In));
    blueprint.setPortOut(createPort(outPortDef, blueprint, PortDirection.Out));
}

function setBlueprintProperties(blueprint: BlueprintModel, properties: PropertyApiResponse) {
    Object.keys(properties).forEach((propertyName: string) => {
        blueprint.addProperty(new PropertyModel(propertyName, createTypeModel(properties[propertyName])));
    });
}

function createPropertyAssignments(blueprint: BlueprintModel, propDefs: PropertyAssignmentsApiResponse): PropertyAssignments {
    const propAssigns = new PropertyAssignments(Array.from(blueprint.getProperties()));
    if (propDefs) {
        Object.keys(propDefs).forEach((propName: string) => {
            propAssigns.assign(propName, propDefs[propName]);
        });
    }
    return propAssigns
}

function createGenericSpecifications(blueprint: BlueprintModel, genSpeciData: GenericSpecificationsApiResponse): GenericSpecifications {
    const genSpeci = new GenericSpecifications(Array.from(blueprint.getGenericIdentifiers()));
    if (genSpeciData) {
        Object.keys(genSpeciData).forEach((genId: string) => {
            genSpeci.specify(genId, createTypeModel(genSpeciData[genId]));
        });
    }
    return genSpeci
}

export function fillLandscape(landscape: LandscapeModel, bpDataList: Array<BlueprintApiResponse>) {
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

        const blueprint = landscape.createBlueprint(bpData.name, type);
        if (bpData.def.services) {
            setBlueprintServices(blueprint, bpData.def.services);
        }
        if (bpData.def.delegates) {
            setBlueprintDelegates(blueprint, bpData.def.delegates);
        }
        if (bpData.def.properties) {
            setBlueprintProperties(blueprint, bpData.def.properties);
        }
        const def = bpData.def;
        blueprintToOperator.set(blueprint, def);
        landscape.addBlueprint(blueprint);
    });

    // 2) Add Operators. Use previously defined Blueprints for assigning Operator.blueprint
    blueprintToOperator.forEach((bpDef: BlueprintDefApiResponse, outerBlueprint: BlueprintModel) => {
        const operators = bpDef.operators;
        if (operators) {
            Object.keys(operators).forEach((opName: string) => {
                const opData = operators[opName];
                const blueprint = landscape.findBlueprint(opData.operator);
                if (!blueprint) {
                    throw `unknown blueprint '${opData.operator}'`;
                }
                const propAssigns = createPropertyAssignments(blueprint, opData.properties);
                const genSpeci = createGenericSpecifications(blueprint, opData.generics);
                outerBlueprint.createOperator(opName, blueprint, propAssigns, genSpeci);
            });
        }
    });

    // 3) Connect operator and blueprint ports
    blueprintToOperator.forEach((bpDef: BlueprintDefApiResponse, outerBlueprint: BlueprintModel) => {
        const connections = bpDef.connections;
        if (connections) {
            Object.keys(connections).forEach((sourcePortReference: string) => {
                const destinationPortReferences = connections[sourcePortReference];
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
}