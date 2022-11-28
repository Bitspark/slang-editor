import {BlueprintMeta} from "../core/models/blueprint";

import {SlangTypeValue} from "./type";

export type UUID = string;

export interface XY {
	x: number;
	y: number;
}

export interface TypeDefApiResponse {
	type: "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic";
	map?: {
		[portName: string]: TypeDefApiResponse,
	};
	stream?: TypeDefApiResponse;
	generic?: string;
}

export interface PortGroupsApiResponse {
	[portGroupName: string]: PortGroupApiResponse;
}

export interface PortGroupApiResponse {
	in: TypeDefApiResponse;
	out: TypeDefApiResponse;
	geometry?: {
		in: {
			position: number,
		}
		out: {
			position: number,
		},
	};
}

export interface PropertyApiResponse {
	[propertyName: string]: TypeDefApiResponse;
}

export interface PropertyAssignmentsApiResponse {
	[propertyName: string]: any;
}

export interface GenericSpecificationsApiResponse {
	[genericIdentifier: string]: TypeDefApiResponse;
}

export interface RunOperatorJson {
	blueprint: string;
	properties?: PropertyAssignmentsApiResponse;
	generics?: GenericSpecificationsApiResponse;
}

export interface RunningOperatorJson {
	blueprint: string;
	url: string;
	handle: string;
}

export interface PortMessageJson {
	handle: string;
	port: string;
	data: SlangTypeValue;
	isBOS: boolean;
	isEOS: boolean;
}

export interface OperatorGeometry {
	position: XY;
}

export interface OperatorJson {
	operator: string;
	geometry?: OperatorGeometry;
	properties: PropertyAssignmentsApiResponse;
	generics: GenericSpecificationsApiResponse;
}
export interface BlueprintsJson {
	local: BlueprintJson[];
	library: BlueprintJson[];
	elementary: BlueprintJson[];
}

export interface BlueprintApiResponse {
	type: string;
	def: BlueprintJson;
}
export interface BlueprintJson {
	id: string;
	meta: BlueprintMeta;
	operators?: {
		[operatorName: string]: OperatorJson,
	};
	properties?: PropertyApiResponse;
	services?: PortGroupsApiResponse;
	delegates?: PortGroupsApiResponse;
	connections?: ConnectionsApiResponse;
	geometry?: {
		size: {
			width: number
			height: number,
		},
	};
	tests?: any;
	complete?: boolean;
}

export interface ConnectionsApiResponse {
	[sourcePortReference: string]: string[];
}

export interface SlangBundle {
	main: string;
	args?: {
		properties: PropertyAssignmentsApiResponse;
		generics: GenericSpecificationsApiResponse;
	};
	blueprints: {
		[id: string]: BlueprintJson,
	};
}
