import {BlueprintMeta} from "../core/models/blueprint";

import {SlangTypeValue} from "./type";

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

export interface DeploymentStatusApiResponse {
	url: string;
	handle: string;
}

export interface OperatorGeometry {
	position: XY;
}

export interface OperatorApiResponse {
	operator: string;
	geometry?: OperatorGeometry;
	properties: PropertyAssignmentsApiResponse;
	generics: GenericSpecificationsApiResponse;
}

export interface BlueprintJson {
	id: string;
	meta: BlueprintMeta;
	operators?: {
		[operatorName: string]: OperatorApiResponse,
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
}

export interface ConnectionsApiResponse {
	[sourcePortReference: string]: [string];
}

export interface BlueprintApiResponse {
	type: string;
	def: BlueprintJson;
}

export class ApiService {

	private static normalizeUrl(url: string): string {
		let scheme = null;
		let schemePath = url;

		if (url.startsWith("//") || url.indexOf("://") > 0) {
			[scheme, schemePath] = (url.startsWith("//")) ? ["", url] : url.split("://");
			scheme = (scheme) ? scheme + ":" : "";
		}
		schemePath = schemePath.replace("//", "/");
		schemePath = (schemePath.endsWith("/")) ? schemePath.slice(0, -1) : schemePath;

		return (scheme) ? `${scheme}//${schemePath}` : schemePath;
	}

	private readonly url: string;

	constructor(host: string) {
		this.url = ApiService.normalizeUrl(host);
	}

	public async getBlueprints(): Promise<BlueprintApiResponse[]> {
		return this.httpGet<{}, BlueprintApiResponse[]>(
			"/operator/",
			{},
			(data: any) => (data as { objects: any }).objects as BlueprintApiResponse[],
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async storeBlueprint(blueprintDefJSON: BlueprintJson): Promise<any> {
		const process = (data: any) => {
			if (data) {
				console.error(data);
				return false;
			}
			return true;
		};
		const error = (err: any) => {
			console.error(err);
		};

		return new Promise<boolean>((resolve) => {
			const reqInit = {method: "post", body: JSON.stringify(blueprintDefJSON)};
			fetch(`${this.url}/operator/def/`, reqInit)
				.then((response: Response) => response.json())
				.then((data: any) => {
					resolve(process(data));
				})
				.catch(error);
		});
	}

	public async deployBlueprint(blueprintId: string): Promise<DeploymentStatusApiResponse> {
		return this.httpPost<{ id: string, props: any, gens: any, stream: boolean }, DeploymentStatusApiResponse>(
			"/run/",
			{id: blueprintId, props: {}, gens: {}, stream: false},
			(data: any) => {
				if (data.status === "success") {
					return data as DeploymentStatusApiResponse;
				}
				throw(data);
			},
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async shutdownBlueprintInstance(accessHandle: string): Promise<{}> {
		return this.httpDelete<{ handle: string }, {}>(
			"/run/",
			{handle: accessHandle},
			(data: any) => {
				if (data.status === "success") {
					return data;
				}
				throw(data);
			},
			(err: any) => {
				console.error(err);
			},
		);
	}

	public async pushInput(instanceUrl: string, inputData: SlangTypeValue): Promise<SlangTypeValue> {
		return this.httpPost<SlangTypeValue, SlangTypeValue>(
			instanceUrl,
			inputData,
			(outputData: SlangTypeValue) => outputData,
			(err: any) => {
				console.error(err);
			},
		);
	}

	private fetch<S, T>(method: string, path: string, data: S, process: (responseParsed: any) => T, error: (error: any) => void): Promise<T> {
		return new Promise<T>((resolve) => {
			const reqInit = (method !== "get") ? {method, body: JSON.stringify(data)} : {};
			fetch(this.url + path, reqInit)
				.then((response: Response) => response.json())
				.then((responseParsed: any) => {
					resolve(process(responseParsed));
				})
				.catch(error);
		});
	}

	private httpGet<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"get",
			path,
			data,
			process,
			error,
		);
	}

	private httpPost<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"post",
			path,
			data,
			process,
			error,
		);
	}

	private httpDelete<ReqT, RespT>(path: string, data: ReqT, process: (responseParsed: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"delete",
			path,
			data,
			process,
			error,
		);
	}

}
