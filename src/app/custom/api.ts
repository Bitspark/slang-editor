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
    [genericIdentifier: string]: any
}

export interface BlueprintDefApiResponse {
    operators?: {
        [operatorName: string]: {
            operator: string
            properties: PropertyAssignmentsApiResponse
            generics: GenericSpecificationsApiResponse
        }
    }
    properties?: PropertyApiResponse
    services?: PortGroupApiResponse
    delegates?: PortGroupApiResponse
    connections?: {
        [sourcePortReference: string]: [string]
    }
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
			fetch(this.host + path, {method, data} as any)
				.then((response: Response) => response.json())
				.then((data: any) => resolve(process(data)))
				.catch(error);
		});
	}

	private GET<ReqT, RespT>(path: string, data: ReqT, process: (_: any) => RespT, error: (error: any) => void): Promise<RespT> {
		return this.fetch<ReqT, RespT>(
			"GET",
			path,
			data,
			process,
			error
		)
	}

	public async getBlueprints(): Promise<Array<BlueprintApiResponse>> {
		return this.GET<{}, Array<BlueprintApiResponse>>(
			'/operator/',
			{},
			(data: any) => (data as { objects: any }).objects as Array<BlueprintApiResponse>,
			(err: any) => console.error(err)
		);
	}

}
