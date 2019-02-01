import {
	BlueprintApiResponse, BlueprintDefApiResponse,
	ConnectionsApiResponse, GenericSpecificationsApiResponse,
	OperatorApiResponse, PortGroupApiResponse, PortGroupsApiResponse,
	PropertyApiResponse, PropertyAssignmentsApiResponse, TypeDefApiResponse,
} from "../../definitions/api";
import {SlangType, TypeIdentifier} from "../../definitions/type";
import {BlueprintModel, BlueprintType} from "../models/blueprint";
import {BlueprintDelegateModel, OperatorDelegateModel} from "../models/delegate";
import {LandscapeModel} from "../models/landscape";
import {OperatorModel} from "../models/operator";
import {
	BlueprintPortModel,
	Connection,
	GenericSpecifications,
	OperatorPortModel,
	PortDirection,
	PortModel,
} from "../models/port";
import {PropertyAssignment, PropertyAssignments, PropertyModel} from "./property";

/*
\
 \ Model --> JSON
  \
 */

function iter2map<S, T>(iter: IterableIterator<S>, process: (result: T, curr: S) => void): T {
	return Array.from(iter).reduce((result, curr) => {
		process(result, curr);
		return result;
	}, {} as T);
}

export function blueprintModelToJSON(blueprint: BlueprintModel): BlueprintDefApiResponse {
	const blueprintGeometry = blueprint.getGeometry();
	return {
		geometry: blueprintGeometry,
		operators: iter2map<OperatorModel, { [_: string]: OperatorApiResponse }>(blueprint.getOperators(),
			(result, operator) => {
				result[operator.getName()] = operatorModelToJSON(operator);
			}),
		services: {
			main: iter2map<PortModel, PortGroupApiResponse>(blueprint.getPorts(),
				(result, port) => {
					const portDir = port.isDirectionIn() ? "in" : "out";
					result[portDir] = typeModelToJSON(port.getType());
					if (!result.geometry) {
						result.geometry = blueprintGeometry.port;
					}
				}),
		},
		delegates: iter2map<BlueprintDelegateModel, PortGroupsApiResponse>(blueprint.getDelegates(),
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
	};
}

function operatorModelToJSON(operator: OperatorModel): OperatorApiResponse {
	return {
		operator: operator.getBlueprint().getFullName(),
		geometry: operator.getGeometry(),
		properties: iter2map<PropertyAssignment, PropertyAssignmentsApiResponse>(operator.getPropertyAssignments().getAssignments(),
			(result, propAssign) => {
				result[propAssign.getName()] = propAssign.getValue();
			}),
		generics: iter2map<[string, SlangType], GenericSpecificationsApiResponse>(operator.getGenericSpecifications().getIterator(),
			(result, [name, type]) => {
				result[name] = typeModelToJSON(type);
			}),
	};
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
	}
	if (port instanceof OperatorPortModel) {
		return operatorPortDef(port);
	}
	throw new Error("unexpected port model");
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
	}
	return `${ownerRefParts.join(".")})${portRef}`;
}

function operatorPortDef(port: OperatorPortModel): string {
	const portRef = port.getPortReference();
	const owner = port.getOwner();
	const ownerRefParts = [];

	if (owner instanceof OperatorDelegateModel) {
		const operator = owner.getParentNode() as OperatorModel;
		ownerRefParts.push(operator.getName());
		ownerRefParts.push(owner.getName());
	} else if (owner instanceof OperatorModel) {
		ownerRefParts.push(owner.getName());
	} else {
		// ...
	}

	const ownerRef = ownerRefParts.join(".");
	if (port.isDirectionIn()) {
		return `${portRef}(${ownerRef}`;
	}
	return `${ownerRef})${portRef}`;

}

function fromTypeIdentifier(t: TypeIdentifier): "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic" {
	return TypeIdentifier[t].toLowerCase() as "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic";
}

/*
\
 \ JSON --> MODEL
  \
 */

export function fillLandscape(landscape: LandscapeModel, bpDataList: BlueprintApiResponse[]) {
	const blueprintToOperator = new Map<BlueprintModel, BlueprintDefApiResponse>();
	// 1) Add Blueprints
	bpDataList.forEach((bpData) => {
		const type: BlueprintType | null = ({
			local: BlueprintType.Local,
			library: BlueprintType.Library,
			elementary: BlueprintType.Elementary,
		} as any)[bpData.type];

		if (type === null) {
			throw new Error(`unknown blueprint type '${bpData.type}'`);
		}

		const services = bpData.def.services;
		const bpGeo = bpData.def.geometry;
		const geometry = (services && bpGeo) ? Object.assign(bpGeo, {port: services.main.geometry!}) : undefined;

		const blueprint = landscape.createBlueprint({fullName: bpData.name, type, geometry});
		if (services) {
			setBlueprintServices(blueprint, services);
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
					outerBlueprint.createOperator(opName, blueprint, propAssigns, genSpeci, opData.geometry);
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
							throw new Error(`source port ${sourcePortReference} of blueprint ${outerBlueprint.getFullName()} cannot be resolved`);
						}
						if (!destinationPort) {
							throw new Error(`destination port ${destinationPortReference} of blueprint ${outerBlueprint.getFullName()} cannot be resolved`);
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
		throw new Error(`unknown property type '${TypeIdentifier[type]}'`);
	}

	return type;
}

function setBlueprintDelegates(blueprint: BlueprintModel, delegates: PortGroupsApiResponse) {
	Object.keys(delegates).forEach((delegateName: string) => {
		blueprint.createDelegate({name: delegateName}, (delegate) => {
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

function setBlueprintServices(blueprint: BlueprintModel, services: PortGroupsApiResponse) {
	const portInDef: TypeDefApiResponse = services.main.in;
	const portOutDef: TypeDefApiResponse = services.main.out;
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
