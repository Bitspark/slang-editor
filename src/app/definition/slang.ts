import {BlueprintModel, BlueprintType} from '../model/blueprint';
import {BlueprintApiResponse, BlueprintDefApiResponse, PortApiResponse, PortGroupApiResponse} from '../services/api';
import {LandscapeModel} from '../model/landscape';
import {BlueprintDelegateModel} from '../model/delegate';
import {BlueprintPortModel, PortType} from '../model/port';

const blueprintToOperator = new Map<BlueprintModel, BlueprintDefApiResponse>();

function createPort(portDef: PortApiResponse, owner: BlueprintModel | BlueprintDelegateModel, directionIn: boolean): BlueprintPortModel {
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

    const port = new BlueprintPortModel(null, owner, type, directionIn);

    switch (port.getType()) {
        case PortType.Map:
            Object.keys(portDef.map!).forEach((portName: string) => {
                port.addMapSubPort(portName, createPort(portDef.map![portName], owner, directionIn));
            });
            break;
        case PortType.Stream:
            port.setStreamSubPort(createPort(portDef.stream!, owner, directionIn));
            break;
    }

    return port;
}

function setBlueprintServices(blueprint: BlueprintModel, services: PortGroupApiResponse) {
    const portInDef: PortApiResponse = services["main"].in;
    const outPortDef: PortApiResponse = services["main"].out;
    blueprint.setPortIn(createPort(portInDef, blueprint, true));
    blueprint.setPortOut(createPort(outPortDef, blueprint, false));
}

function setBlueprintDelegates(blueprint: BlueprintModel, delegates: PortGroupApiResponse) {
    Object.keys(delegates).forEach((delegateName: string) => {
        const delegate = blueprint.createDelegate(delegateName);
        delegate.setPortIn(createPort(delegates[delegateName].in, delegate, true));
        delegate.setPortOut(createPort(delegates[delegateName].out, delegate, false));
    });
}

export function fillLandscape(landscape: LandscapeModel, bpDataList: Array<BlueprintApiResponse>) {
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
        const def = bpData.def;

        blueprintToOperator.set(blueprint, def);
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
                outerBlueprint.createOperator(opName, blueprint);
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