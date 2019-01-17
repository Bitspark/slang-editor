import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {
	BlueprintApiResponse,
	BlueprintDefApiResponse, ConnectionsApiResponse,
	GenericSpecificationsApiResponse, OperatorApiResponse,
	PortGroupApiResponse,
	PropertyApiResponse,
	PropertyAssignmentsApiResponse,
	TypeDefApiResponse
} from "./api";
import {LandscapeModel} from "../model/landscape";
import {BlueprintDelegateModel, OperatorDelegateModel} from "../model/delegate";
import {BlueprintPortModel, OperatorPortModel, PortDirection, PortModel} from "../model/port";
import {PropertyAssignment, PropertyAssignments, PropertyModel} from "../model/property";
import {TypeIdentifier, SlangType} from "./type";
import {GenericSpecifications} from "./generics";
import {OperatorModel} from "../model/operator";
import {Connection} from "./connections";

/*
\
 \ Model --> JSON
  \
 */

function iter2map<S, T>(iter: IterableIterator<S>, process: (result: T, curr: S) => void): T {
	return Array.from(iter).reduce((result, curr) => {
		process(result, curr);
		return result;
	}, {} as T)
}

export function blueprintModelToJSON(blueprint: BlueprintModel): BlueprintDefApiResponse {
	return {
		operators: iter2map<OperatorModel, { [_: string]: OperatorApiResponse }>(blueprint.getOperators(),
			(result, operator) => {
				result[operator.getName()] = operatorModelToJSON(operator);
			}),
		services: {
			main: iter2map<PortModel, { in: TypeDefApiResponse, out: TypeDefApiResponse }>(blueprint.getPorts(),
				(result, port) => {
					result[port.isDirectionIn() ? "in" : "out"] = typeModelToJSON(port.getType());
				})
		},
		delegates: iter2map<BlueprintDelegateModel, PortGroupApiResponse>(blueprint.getDelegates(),
			(result, delegate) => {
				const portDef: any = {};
				const portIn = delegate.getPortIn();
				const portOut = delegate.getPortOut();

				if (portIn) {
					portDef.in = typeModelToJSON(portIn.getType());
				}

				if (portOut) {
					portDef.out = typeModelToJSON(portOut.getType());
				}
				result[delegate.getName()] = portDef;
			}),
		properties: iter2map<PropertyModel, PropertyApiResponse>(blueprint.getProperties(),
			(result, property) => {
				result[property.getName()] = typeModelToJSON(property.getType());
			}),
		connections: iter2map<Connection, ConnectionsApiResponse>(blueprint.getConnectionsTo().getIterator(),
			(result: ConnectionsApiResponse, connection) => {
				const srcPortRef = getFullPortRef(connection.source);
				const dstPortRef = getFullPortRef(connection.destination);
				if (!result[srcPortRef]) {
					result[srcPortRef] = [dstPortRef];
				} else {
					result[srcPortRef].push(dstPortRef);
				}
			}),
	}
}

function operatorModelToJSON(operator: OperatorModel): OperatorApiResponse {
	return {
		operator: operator.getBlueprint().getFullName(),
		properties: iter2map<PropertyAssignment, PropertyAssignmentsApiResponse>(operator.getPropertyAssignments().getAssignments(),
			(result, propAssign) => {
				result[propAssign.getName()] = propAssign.getValue();
			}),
		generics: iter2map<[string, SlangType], GenericSpecificationsApiResponse>(operator.getGenericSpecifications().getIterator(),
			(result, [name, type]) => {
				result[name] = typeModelToJSON(type);
			}),
	}
}

function typeModelToJSON(type: SlangType): TypeDefApiResponse {
	switch (type.getTypeIdentifier()) {
		case TypeIdentifier.Map:
			return {
				type: fromTypeIdentifier(type.getTypeIdentifier()),
				map: iter2map<[string, SlangType], any>(type.getMapSubs(), (obj, [name, slType]) => {
					obj[name] = typeModelToJSON(slType);
					return obj;
				}),
			};
		case TypeIdentifier.Stream:
			return {
				type: fromTypeIdentifier(type.getTypeIdentifier()),
				stream: typeModelToJSON(type.getStreamSub()),
			};
		case TypeIdentifier.Generic:
			return {
				type: fromTypeIdentifier(type.getTypeIdentifier()),
				generic: type.getGenericIdentifier(),
			};
		default:
			return {type: fromTypeIdentifier(type.getTypeIdentifier())};
	}
}

function getFullPortRef(port: PortModel): string {
	if (port instanceof BlueprintPortModel) {
		return blueprintPortRef(port);
	} else if (port instanceof OperatorPortModel) {
		return operatorPortDef(port);
	} else {
		throw new Error("unexpected port model");
	}
}

function blueprintPortRef(port: BlueprintPortModel): string {
	const portRef = port.getPortReference();
	const ownerRefParts = [""];
	const owner = port.getOwner();

	if (owner instanceof BlueprintDelegateModel) {
		const delegate = owner as BlueprintDelegateModel;
		ownerRefParts.push(delegate.getName());
	}

	if (port.isDirectionIn()) {
		return `${portRef}(${ownerRefParts.join(".")}`;
	} else {
		return `${ownerRefParts.join(".")})${portRef}`;
	}
}

function operatorPortDef(port: OperatorPortModel): string {
	const portRef = port.getPortReference();
	const owner = port.getOwner();
	const ownerRefParts = [];

	if (owner instanceof OperatorDelegateModel) {
		const operator = owner.getParentNode() as OperatorModel;
		ownerRefParts.push(operator.getName());
		ownerRefParts.push(owner.getName());
	} else if (owner instanceof OperatorModel)  {
		ownerRefParts.push(owner.getName());
	} else {
		// ...
	}

	const ownerRef = ownerRefParts.join(".");
	if (port.isDirectionIn()) {
		return `${portRef}(${ownerRef}`;
	} else {
		return `${ownerRef})${portRef}`;
	}

}

function fromTypeIdentifier(t: TypeIdentifier): "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic" {
	return TypeIdentifier[t].toLowerCase() as "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic";
}

/*
\
 \ JSON --> MODEL
  \
 */

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
			throw new Error(`unknown blueprint type '${bpData.type}'`);
		}

		const blueprint = landscape.createBlueprint({fullName: bpData.name, type});
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
	});

	// 2) Add Operators. Use previously defined Blueprints for assigning Operator.blueprint
	blueprintToOperator.forEach((bpDef: BlueprintDefApiResponse, outerBlueprint: BlueprintModel) => {
		const operators = bpDef.operators;
		if (operators) {
			Object.keys(operators).forEach((opName: string) => {
				const opData = operators[opName];
				const blueprint = landscape.findBlueprint(opData.operator);
				if (!blueprint) {
					throw new Error(`unknown blueprint '${opData.operator}'`);
				}
				try {
					const genSpeci = createGenericSpecifications(blueprint, opData.generics);
					const propAssigns = createPropertyAssignments(blueprint, opData.properties, genSpeci);
					outerBlueprint.createOperator(opName, blueprint, propAssigns, genSpeci);
				} catch (e) {
					console.error(`${outerBlueprint.getFullName()} (${blueprint.getFullName()}): ${e.stack}`);
				}
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
						console.error(`${outerBlueprint.getFullName()}: ${e.stack}`);
					}
				}
			});
		}
	});
}


function toTypeIdentifier(typeName: string): TypeIdentifier {
	const type = ({
		number: TypeIdentifier.Number,
		binary: TypeIdentifier.Binary,
		boolean: TypeIdentifier.Boolean,
		string: TypeIdentifier.String,
		trigger: TypeIdentifier.Trigger,
		primitive: TypeIdentifier.Primitive,
		generic: TypeIdentifier.Generic,
		stream: TypeIdentifier.Stream,
		map: TypeIdentifier.Map,
	} as { [_: string]: TypeIdentifier })[typeName];

	if (type === null) {
		throw `unknown property type '${TypeIdentifier[type]}'`;
	}

	return type;
}

function setBlueprintDelegates(blueprint: BlueprintModel, delegates: PortGroupApiResponse) {
	Object.keys(delegates).forEach((delegateName: string) => {
		blueprint.createDelegate({name: delegateName}, delegate => {
			createPort(delegates[delegateName].in, delegate, PortDirection.In);
			createPort(delegates[delegateName].out, delegate, PortDirection.Out);
		});
	});
}

function createPort(typeDef: TypeDefApiResponse, owner: BlueprintModel | BlueprintDelegateModel, direction: PortDirection): BlueprintPortModel {
	return owner.createPort({name: "", type: createTypeModel(typeDef), direction});
}

function createTypeModel(typeDef: TypeDefApiResponse): SlangType {
	const type = new SlangType(null, toTypeIdentifier(typeDef.type));
	switch (type.getTypeIdentifier()) {
		case TypeIdentifier.Map:
			if (typeDef.map) {
				Object.keys(typeDef.map).forEach((subName: string) => {
					type.addMapSub(subName, createTypeModel(typeDef.map![subName]));
				});
			}
			break;
		case TypeIdentifier.Stream:
			type.setStreamSub(createTypeModel(typeDef.stream!));
			break;
		case TypeIdentifier.Generic:
			type.setGenericIdentifier(typeDef.generic!);
			break;
	}
	return type;
}

function setBlueprintServices(blueprint: BlueprintModel, services: PortGroupApiResponse) {
	const portInDef: TypeDefApiResponse = services["main"].in;
	const portOutDef: TypeDefApiResponse = services["main"].out;
	createPort(portInDef, blueprint, PortDirection.In);
	createPort(portOutDef, blueprint, PortDirection.Out);
}

function setBlueprintProperties(blueprint: BlueprintModel, properties: PropertyApiResponse) {
	Object.keys(properties).forEach((propertyName: string) => {
		blueprint.addProperty(new PropertyModel(propertyName, createTypeModel(properties[propertyName])));
	});
}

function createPropertyAssignments(blueprint: BlueprintModel, propDefs: PropertyAssignmentsApiResponse, genSpeci: GenericSpecifications): PropertyAssignments {
	const propAssigns = new PropertyAssignments(Array.from(blueprint.getProperties()), genSpeci);
	if (propDefs) {
		Object.keys(propDefs).forEach((propName: string) => {
			propAssigns.get(propName).assign(propDefs[propName]);
		});
	}
	return propAssigns;
}

function createGenericSpecifications(blueprint: BlueprintModel, genSpeciData: GenericSpecificationsApiResponse): GenericSpecifications {
	const genSpeci = new GenericSpecifications(Array.from(blueprint.getGenericIdentifiers()));
	if (genSpeciData) {
		Object.keys(genSpeciData).forEach((genId: string) => {
			genSpeci.specify(genId, createTypeModel(genSpeciData[genId]));
		});
	}
	return genSpeci;
}

