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

export interface PropertyDefinitionsApiResponse {
    [propertyName: string]: any
}

export interface BlueprintDefApiResponse {
    operators?: {
        [operatorName: string]: {
            operator: string
            properties: PropertyDefinitionsApiResponse
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

    constructor(private host: string = '') {
    }

    private fetch<T>(path: string, process: (_: any) => T, error: (error: any) => void): Promise<T> {
        return new Promise<T>((resolve) => {
            fetch(this.host + path)
                .then((response: Response) => response.json())
                .then((data: any) => resolve(process(data)))
                .catch(error);
        });
    }

    public async getBlueprints(): Promise<Array<BlueprintApiResponse>> {
        return this.fetch<Array<BlueprintApiResponse>>(
            '/operator',
            (data: any) => (data as { objects: any }).objects as Array<BlueprintApiResponse>,
            (err: any) => console.error(err)
        );
    }

}
