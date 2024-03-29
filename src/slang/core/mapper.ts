import {
	BlueprintJson,
	BlueprintsJson,
	ConnectionsApiResponse, GenericSpecificationsApiResponse,
	OperatorJson,
	PortGroupApiResponse, PortGroupsApiResponse, PropertyApiResponse, PropertyAssignmentsApiResponse,
	TypeDefApiResponse,
} from "../definitions/api";
import {SlangType, TypeIdentifier} from "../definitions/type";

import {PortDirection, PortModel} from "./abstract/port";
import {Connection} from "./abstract/utils/connections";
import {GenericSpecifications} from "./abstract/utils/generics";
import {PropertyAssignment, PropertyAssignments, PropertyModel} from "./abstract/utils/properties";
import {LandscapeModel} from "./models";
import {OperatorModel} from "./models";
import {BlueprintPortModel, OperatorPortModel} from "./models";
import {BlueprintModel, BlueprintType} from "./models/blueprint";
import {BlueprintDelegateModel, OperatorDelegateModel} from "./models/delegate";

/*
\
 \ MODEL --> JSON
  \
 */

function iter2map<S, T>(iter: Iterable<S>, process: (result: T, curr: S) => void): T {
	return Array.from(iter).reduce((result, curr) => {
		process(result, curr);
		return result;
	}, {} as T);
}

export function blueprintModelToJson(blueprint: BlueprintModel): BlueprintJson {
	const blueprintGeometry = blueprint.geometry;
	return {
		id: blueprint.uuid,
		tests: blueprint.tests,
		meta: blueprint.meta,
		geometry: blueprintGeometry,
		operators: iter2map<OperatorModel, { [_: string]: OperatorJson }>(blueprint.getOperators(),
			(result, operator) => {
				result[operator.name] = operatorModelToJSON(operator);
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

				if (!portDef.geometry) {
					portDef.geometry = delegate.getGeometry();
				}

				result[delegate.getName()] = portDef;
			}),
		properties: iter2map<PropertyModel, PropertyApiResponse>(blueprint.getProperties(),
			(result, property) => {
				result[property.getName()] = typeModelToJSON(property.getType());
			}),
		connections: iter2map<Connection, ConnectionsApiResponse>(blueprint.getConnectionsTo(),
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

function operatorModelToJSON(operator: OperatorModel): OperatorJson {
	return {
		operator: operator.getBlueprint().uuid,
		geometry: operator.getGeometry(),
		properties: iter2map<PropertyAssignment, PropertyAssignmentsApiResponse>(operator.getProperties().getAssignments(),
			(result, propAssign) => {
				result[propAssign.getName()] = propAssign.getValue();
			}),
		generics: iter2map<[string, SlangType], GenericSpecificationsApiResponse>(operator.getGenerics().getIterator(),
			(result, [name, type]) => {
				const typeJson = typeModelToJSON(type);
				if (typeJson) {
					result[name] = typeJson;
				}
			}),
	};
}

function typeModelToJSON(type: SlangType): TypeDefApiResponse {
	switch (type.getTypeIdentifier()) {
		case TypeIdentifier.Map:
			return type.hasMapSubs() 
			? {
				type: fromTypeIdentifier(type.getTypeIdentifier())!,
				map: iter2map<[string, SlangType], any>(type.getMapSubs(), (obj, [name, slType]) => {
					obj[name] = typeModelToJSON(slType);
					return obj;
				}),
			}
			: {type: fromTypeIdentifier(TypeIdentifier.Unspecified)};
		case TypeIdentifier.Stream:
			return {
				type: fromTypeIdentifier(type.getTypeIdentifier())!,
				stream: typeModelToJSON(type.getStreamSub()),
			};
		case TypeIdentifier.Generic:
			return {
				type: fromTypeIdentifier(type.getTypeIdentifier())!,
				generic: type.getGenericIdentifier(),
			};
		default:
			return {type: fromTypeIdentifier(type.getTypeIdentifier())!};
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
		ownerRefParts.push(operator.name);
		ownerRefParts.push(owner.getName());
	} else if (owner instanceof OperatorModel) {
		ownerRefParts.push(owner.name);
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

export function genericSpecificationToJSON(generics: GenericSpecifications): GenericSpecificationsApiResponse {
	return Array
		.from(generics.getIterator())
		.reduce((genSpecsJson, [genId, type]) => {
			genSpecsJson[genId] = typeModelToJSON(type)
			return genSpecsJson;
		}, {} as GenericSpecificationsApiResponse)
}

export function propertyAssignmentsToJSON(properties: PropertyAssignments): PropertyAssignmentsApiResponse {
	return Array
		.from(properties.getAssignments())
		.reduce((propAssignJson, propAssign) => {
			propAssignJson[propAssign.getName()] = propAssign.getValue()
			return propAssignJson;
		}, {} as PropertyAssignmentsApiResponse)
}

/*
\
 \ JSON --> MODEL
  \
 */

export function loadBlueprints(landscape: LandscapeModel, blueprintsJson: BlueprintsJson) {
	// 1) Create unfinished blueprints (only with some basic information)
	blueprintsJson.elementary.forEach((blueprintJson) => {
		createUnfinishedBlueprintModel(landscape, blueprintJson, BlueprintType.Elementary);
	});
	blueprintsJson.library.forEach((blueprintJson) => {
		createUnfinishedBlueprintModel(landscape, blueprintJson, BlueprintType.Library);
	});
	blueprintsJson.local.forEach((blueprintJson) => {
		try {
			createUnfinishedBlueprintModel(landscape, blueprintJson, BlueprintType.Local, true);
		} catch (err) {
			console.error(err)
			return;
		}
	});

	// 2) Add Operators. Use previously defined Blueprints for assigning Operator.blueprint
	const blueprintJsonList = blueprintsJson.library.concat(blueprintsJson.local);

	blueprintJsonList.forEach((bpJson: BlueprintJson) => {
		const outerBlueprint = landscape.findBlueprint(bpJson.id);
		if (!outerBlueprint) {
			return;
		}
		instantiateBlueprintOperators(landscape, outerBlueprint, bpJson.operators || {});
	});

	// 3) Connect operator and blueprint ports
	blueprintJsonList.forEach((bpDef: BlueprintJson) => {
		const outerBlueprint = landscape.findBlueprint(bpDef.id);
		if (!outerBlueprint) {
			return;
		}

		const connections = bpDef.connections;
		if (!connections) {
			return;
		}
		connectBlueprintOperators(outerBlueprint, connections);
	});
}

/*
export function addBlueprint(landscape: LandscapeModel, bpDef: BlueprintJson, bpType: BlueprintType): BlueprintModel {
	return createUnfinishedBlueprintModel(landscape, bpDef, bpType);
}
 */

function createUnfinishedBlueprintModel(landscape: LandscapeModel, bpDef: BlueprintJson, bpType: BlueprintType, replace: boolean = false): BlueprintModel {
	const existingBp = landscape.findBlueprint(bpDef.id)
	if (!!existingBp) {
		if (!replace) {
			throw new BlueprintExistsError(existingBp.uuid);
		}
		existingBp.destroy()
	}

	const services = bpDef.services;
	const bpGeo = bpDef.geometry;
	const geometry = (services && bpGeo) ? Object.assign(bpGeo, {port: services.main.geometry!}) : undefined;
	const tests = bpDef.tests;

	const blueprint = landscape.createBlueprint({geometry, tests, uuid: bpDef.id, meta: bpDef.meta, type: bpType});
	if (services) {
		setBlueprintServices(blueprint, services);
	}
	if (bpDef.delegates) {
		setBlueprintDelegates(blueprint, bpDef.delegates);
	}
	if (bpDef.properties) {
		setBlueprintProperties(blueprint, bpDef.properties);
	}

	return blueprint;
}

function instantiateBlueprintOperators(landscape: LandscapeModel, blueprint: BlueprintModel, operatorJsonByName: { [k: string]: OperatorJson }) {
	Object.keys(operatorJsonByName).forEach((opName: string) => {
		try {
			operatorJsonToModel(landscape, blueprint, opName, operatorJsonByName[opName]);
		} catch (e) {
			console.error(`[CREATE_OPERATOR_IN_BLUEPRINT] "${blueprint.name}"."${opName}": ${e.stack}`);
		}
	});
}

function connectBlueprintOperators(blueprint: BlueprintModel, connections: ConnectionsApiResponse) {
	Object.keys(connections).forEach((sourcePortReference: string) => {
		const sourcePort = blueprint.resolvePortReference(sourcePortReference);
		if (!sourcePort) {
			console.error(`[CONNECT_PORT_ACCESS_SRC] ${blueprint.name}: port ${sourcePortReference} cannot be resolved`);
			return;
		}

		const destinationPortReferences = connections[sourcePortReference];
		for (const destinationPortReference of destinationPortReferences) {
			const destinationPort = blueprint.resolvePortReference(destinationPortReference);
			if (!destinationPort) {
				console.error(`[CONNECT_PORT_ACCESS_DST] ${blueprint.name}: port ${destinationPortReference} cannot be resolved`);
				continue;
			}

			try {
				sourcePort.connect(destinationPort, false);
			} catch (e) {
				console.error(`[CONNECT_PORT] ${blueprint.name}: ${sourcePort.getPortReference()} -> ${destinationPort.getPortReference()} - ${e.toString()}`);
			}
		}
	});
}

function operatorJsonToModel(landscape: LandscapeModel, outerBlueprint: BlueprintModel, opName: string, opJson: OperatorJson): OperatorModel {
	const blueprint = landscape.findBlueprint(opJson.operator);

	if (!blueprint) {
		throw new Error(`unknown blueprint '${opJson.operator}'`);
	}

	const generics = createGenericSpecifications(blueprint, opJson.generics);
	const properties = createPropertyAssignments(blueprint, opJson.properties, generics);
	return outerBlueprint.createOperator(opName, blueprint, properties, generics, opJson.geometry);
}

export function toTypeIdentifier(typeName: string): TypeIdentifier {
	if (!typeName) {
		return TypeIdentifier.Unspecified;
	}

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
		unspecified: TypeIdentifier.Unspecified,
	} as { [_: string]: TypeIdentifier })[typeName.toLowerCase()];

	if (type === undefined) {
		throw new Error(`unknown type identifier "${typeName}"`);
	}

	return type;
}

function setBlueprintDelegates(blueprint: BlueprintModel, delegates: PortGroupsApiResponse) {
	Object.keys(delegates).forEach((delegateName: string) => {
		blueprint.createDelegate({name: delegateName, geometry: delegates[delegateName].geometry}, (delegate) => {
			createPort(delegates[delegateName].in, delegate, PortDirection.In);
			createPort(delegates[delegateName].out, delegate, PortDirection.Out);
		});
	});
}

function createPort(typeDef: TypeDefApiResponse, owner: BlueprintModel | BlueprintDelegateModel, direction: PortDirection): BlueprintPortModel {
	return owner.createPort({direction, name: "", type: createTypeModel(typeDef, {isGhostPort: true})});
}

export function createTypeModel(typeDef: TypeDefApiResponse, {isGhostPort}: {isGhostPort: boolean} = {isGhostPort: false}): SlangType {
	// isGhostPort == true: SlangType is handle as if it was inferred --> for blueprint ports this is intented
	// 						When ever a connection is removed all inferred ports will with no connection will be removed
	const type = new SlangType(null, toTypeIdentifier(typeDef.type), isGhostPort);
	switch (type.getTypeIdentifier()) {
		case TypeIdentifier.Map:
			if (!typeDef.map) {
				break;
			}
			Object.keys(typeDef.map).forEach((subName: string) => {
				type.addMapSub(subName, createTypeModel(typeDef.map![subName], {isGhostPort}));
			});
			break;
		case TypeIdentifier.Stream:
			type.setStreamSub(createTypeModel(typeDef.stream!, {isGhostPort}));
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
			try {
				propAssigns.get(propName).assign(propDefs[propName]);
			} catch (e) {
				console.warn(`[UNSUPPORTED_PROPTERTY] Blueprint "${blueprint.name}": ${e}`);
			}
		});
	}
	return propAssigns;
}

function createGenericSpecifications(blueprint: BlueprintModel, genericsData: GenericSpecificationsApiResponse): GenericSpecifications {
	const generics = new GenericSpecifications(blueprint.getGenericIdentifiers());
	if (genericsData) {
		Object.keys(genericsData).forEach((genId: string) => {
			generics.specify(genId, createTypeModel(genericsData[genId]));
		});
	}
	return generics;
}

/**
 * Error to indicate a blueprint already exists.
 */
export class BlueprintExistsError extends Error {

	constructor(id: string) {
		super(`Blueprint with uuid ${id} already exists`);
	}

}
