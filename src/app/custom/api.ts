import {SlangTypeValue} from "./type";

export interface TypeDefApiResponse {
	type: "string" | "number" | "boolean" | "binary" | "trigger" | "primitive" | "map" | "stream" | "generic"
	map?: {
		[portName: string]: TypeDefApiResponse,
	}
	stream?: TypeDefApiResponse
	generic?: string
}

export interface PortGroupApiResponse {
	[portGroupName: string]: {
		in: TypeDefApiResponse,
		out: TypeDefApiResponse,
	}
}

export interface PropertyApiResponse {
	[propertyName: string]: TypeDefApiResponse
}

export interface PropertyAssignmentsApiResponse {
	[propertyName: string]: any
}

export interface GenericSpecificationsApiResponse {
	[genericIdentifier: string]: TypeDefApiResponse
}

export interface DeploymentStatusApiResponse {
	url: string
	handle: string
}

export interface OperatorApiResponse {
	operator: string
	properties: PropertyAssignmentsApiResponse
	generics: GenericSpecificationsApiResponse
}

export interface BlueprintDefApiResponse {
	operators?: {
		[operatorName: string]: OperatorApiResponse
	}
	properties?: PropertyApiResponse
	services?: PortGroupApiResponse
	delegates?: PortGroupApiResponse
	connections?: ConnectionsApiResponse
}

export interface ConnectionsApiResponse {
	[sourcePortReference: string]: [string]
}

export interface BlueprintApiResponse {
	type: string,
	name: string,
	def: BlueprintDefApiResponse,
}

export class ApiService {
	private readonly host: string;

	constructor(host: string) {
		this.host = ApiService.normalizeUrl(host);
	}

	private static normalizeUrl(host: string): string {
		let [protocol, url] = (host.startsWith("//")) ? ["", host] : host.split("://");
		protocol = (protocol) ? protocol + ":" : "";
		url = url.replace("//", "/");
		url = (url.endsWith("/")) ? url.slice(0, -1) : url;
		return `${protocol}//${url}`;
	}

	private fetch<S, T>(method: string, path: string, data: S, process: (_: any) => T, error: (error: any) => void): Promise<T> {
		return new Promise<T>((resolve) => {
			const reqInit = (method !== "get") ? {method, body: JSON.stringify(data)} : {};
			fetch(this.host + path, reqInit)
				.then((response: Response) => response.json())
				.then((data: any) => resolve(process(data)))
				.catch(error);
		});
	}

	private GET<ReqT, RespT>(path: string, data: ReqT, process: (_: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"get",
			path,
			data,
			process,
			error
		);
	}

	private POST<ReqT, RespT>(path: string, data: ReqT, process: (_: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"post",
			path,
			data,
			process,
			error
		);
	}

	private DELETE<ReqT, RespT>(path: string, data: ReqT, process: (_: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"delete",
			path,
			data,
			process,
			error
		);
	}

	public async getBlueprints(): Promise<Array<BlueprintApiResponse>> {
		return this.GET<{}, Array<BlueprintApiResponse>>(
			"/operator/",
			{},
			(data: any) => (data as { objects: any }).objects as Array<BlueprintApiResponse>,
			(err: any) => console.error(err)
		);
	}

	public async storeBlueprint(blueprintFullName: string, blueprintDefJSON: BlueprintDefApiResponse): Promise<any> {
		const process = (data: any) => {
			if (data.status === "success") {
				return data as DeploymentStatusApiResponse;
			}
			throw(data);
		};
		const error = (err: any) => console.error(err);

		return new Promise<{}>((resolve) => {
			const reqInit = {method: "post", body: JSON.stringify(blueprintDefJSON)};
			fetch(`${this.host}/operator/def/?fqop=${blueprintFullName}`, reqInit)
				.then((response: Response) => response.json())
				.then((data: any) => resolve(process(data)))
				.catch(error);
		});
	}

	public async deployBlueprint(blueprintFullName: string): Promise<DeploymentStatusApiResponse> {
		return this.POST<{ fqn: string, props: any, gens: any, stream: boolean }, DeploymentStatusApiResponse>(
			"/run/",
			{fqn: blueprintFullName, props: {}, gens: {}, stream: false},
			(data: any) => {
				if (data.status === "success") {
					return data as DeploymentStatusApiResponse;
				}
				throw(data);
			},
			(err: any) => console.error(err)
		);
	}

	public async shutdownBlueprintInstance(accessHandle: string): Promise<{}> {
		return this.DELETE<{ handle: string }, {}>(
			"/run/",
			{handle: accessHandle},
			(data: any) => {
				if (data.status === "success") {
					return data;
				}
				throw(data);
			},
			(err: any) => console.error(err)
		);
	}

	public async pushInput(instanceUrl: string, inputData: SlangTypeValue): Promise<SlangTypeValue> {
		return this.POST<SlangTypeValue, SlangTypeValue>(
			instanceUrl,
			inputData,
			(outputData: SlangTypeValue) => outputData,
			(err: any) => console.error(err)
		);
	}

}
